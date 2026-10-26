import React, {useEffect, useState} from 'react';
import Modal from '@mui/material/Modal';
import {Formik} from 'formik';
import {
  validationSchemaBackupPasswordCreate,
  validationSchemaBackupPasswordEnter,
} from 'utils/validationSchema';
import GeneralButton from 'components/Button';
import {CloseIcon, EyeIcon} from 'components/Home/HomeIcons';
import s from './ModalBackupPassword.module.css';

const LOST_PASSWORD_WARNING =
  'If you lose this password, your backup can NEVER be restored. It is not stored anywhere — not on your device, not on any server. Write it down and keep it safe.';

// Create (with confirm field) or enter the Google Drive backup password. No
// onClose: it only closes through the header's close button. Bottom sheet on
// phones, centred dialog from 600px up.
const ModalBackupPassword = ({
  visible,
  hideModal,
  onSuccess,
  mode = 'enter',
  errorText = '',
}) => {
  const [hide, setHide] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);

  const isCreate = mode === 'create';

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      if (visible) {
        setHide(true);
        setHideConfirm(true);
      }
    })();
  }, [visible]);

  const onSubmit = values => {
    onSuccess && onSuccess(values.backupPassword);
  };

  return (
    <Modal
      open={visible}
      aria-labelledby='backup-password-modal-title'
      slotProps={{backdrop: {className: s.backdrop}}}>
      <div className={s.sheet}>
        <div className={s.handle} />
        <div className={s.header}>
          <span className={s.tile}>
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              aria-hidden='true'>
              <rect x='4' y='11' width='16' height='10' rx='2.5' />
              <path d='M8 11V7a4 4 0 0 1 8 0v4' />
            </svg>
          </span>
          <h2 id='backup-password-modal-title' className={s.title}>
            {isCreate
              ? 'Create a Backup Password'
              : 'Enter Your Backup Password'}
          </h2>
          <button
            type='button'
            className={s.close}
            onClick={hideModal}
            aria-label='Close'>
            <CloseIcon size={15} />
          </button>
        </div>

        {isCreate && (
          <div className={s.warningCard}>
            <svg
              className={s.warningIcon}
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              aria-hidden='true'>
              <circle cx='12' cy='12' r='9' />
              <path d='M12 7.5V12' />
              <path d='M12 16h.01' />
            </svg>
            <p className={s.warningText}>{LOST_PASSWORD_WARNING}</p>
          </div>
        )}

        <Formik
          key={`${mode}-${visible}`}
          initialValues={{
            backupPassword: '',
            backupPasswordConfirm: '',
          }}
          validationSchema={
            isCreate
              ? validationSchemaBackupPasswordCreate
              : validationSchemaBackupPasswordEnter
          }
          onSubmit={onSubmit}>
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
          }) => {
            const passwordError =
              errors.backupPassword && touched.backupPassword;
            const confirmError =
              errors.backupPasswordConfirm && touched.backupPasswordConfirm;
            return (
              <form className={s.form} onSubmit={handleSubmit}>
                <div
                  className={`${s.inputRow} ${
                    passwordError ? s.inputError : ''
                  }`}>
                  <input
                    className={s.input}
                    type={hide ? 'password' : 'text'}
                    name='backupPassword'
                    placeholder='Backup password'
                    autoCapitalize='none'
                    autoFocus
                    aria-invalid={!!passwordError}
                    aria-describedby={
                      passwordError ? 'backup-password-error' : undefined
                    }
                    value={values.backupPassword}
                    onChange={handleChange('backupPassword')}
                    onBlur={handleBlur('backupPassword')}
                  />
                  <button
                    type='button'
                    className={s.reveal}
                    onClick={() => setHide(prev => !prev)}
                    aria-label={hide ? 'Show password' : 'Hide password'}>
                    <EyeIcon size={18} off={!hide} />
                  </button>
                </div>
                {passwordError && (
                  <p id='backup-password-error' className={s.errorText}>
                    {errors.backupPassword}
                  </p>
                )}

                {isCreate && (
                  <>
                    <div
                      className={`${s.inputRow} ${
                        confirmError ? s.inputError : ''
                      }`}>
                      <input
                        className={s.input}
                        type={hideConfirm ? 'password' : 'text'}
                        name='backupPasswordConfirm'
                        placeholder='Confirm backup password'
                        autoCapitalize='none'
                        aria-invalid={!!confirmError}
                        aria-describedby={
                          confirmError
                            ? 'backup-password-confirm-error'
                            : undefined
                        }
                        value={values.backupPasswordConfirm}
                        onChange={handleChange('backupPasswordConfirm')}
                        onBlur={handleBlur('backupPasswordConfirm')}
                      />
                      <button
                        type='button'
                        className={s.reveal}
                        onClick={() => setHideConfirm(prev => !prev)}
                        aria-label={
                          hideConfirm ? 'Show password' : 'Hide password'
                        }>
                        <EyeIcon size={18} off={!hideConfirm} />
                      </button>
                    </div>
                    {confirmError && (
                      <p
                        id='backup-password-confirm-error'
                        className={s.errorText}>
                        {errors.backupPasswordConfirm}
                      </p>
                    )}
                  </>
                )}

                {!!errorText && (
                  <p className={`${s.errorText} ${s.alert}`} role='alert'>
                    {errorText}
                  </p>
                )}

                <GeneralButton
                  type='submit'
                  variant='primary'
                  fullWidth
                  className={s.submit}>
                  {isCreate ? 'Set Password' : 'Unlock Backup'}
                </GeneralButton>
              </form>
            );
          }}
        </Formik>
      </div>
    </Modal>
  );
};

export default ModalBackupPassword;
