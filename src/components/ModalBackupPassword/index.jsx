import React, {useEffect, useState} from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {Formik} from 'formik';
import {
  validationSchemaBackupPasswordCreate,
  validationSchemaBackupPasswordEnter,
} from 'utils/validationSchema';
import s from './ModalBackupPassword.module.css';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  bgcolor: 'var(--secondaryBackgroundColor)',
  borderRadius: '10px',
  overflow: 'hidden',
  '@media (min-width: 500px)': {
    width: '60%',
  },
  '@media (min-width: 768px)': {
    width: '40%',
  },
};

const LOST_PASSWORD_WARNING =
  'If you lose this password, your backup can NEVER be restored. It is not stored anywhere — not on your device, not on any server. Write it down and keep it safe.';

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
    if (visible) {
      setHide(true);
      setHideConfirm(true);
    }
  }, [visible]);

  const onSubmit = values => {
    onSuccess && onSuccess(values.backupPassword);
  };

  return (
    <Modal open={visible} aria-labelledby='backup-password-modal-title'>
      <Box sx={style}>
        <div className={s.container}>
          <div className={s.header}>
            <p id='backup-password-modal-title' className={s.title}>
              {isCreate
                ? 'Create a Backup Password'
                : 'Enter Your Backup Password'}
            </p>
            <IconButton
              onClick={hideModal}
              size='small'
              aria-label='Close'
              sx={{color: 'var(--font)'}}>
              <CloseIcon fontSize='small' />
            </IconButton>
          </div>

          {isCreate && (
            <div className={s.warningCard}>
              <ErrorOutlineIcon
                fontSize='small'
                sx={{color: '#e5b409', flexShrink: 0}}
              />
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
            }) => (
              <form className={s.form} onSubmit={handleSubmit}>
                <div className={s.inputWrapper}>
                  <input
                    className={s.input}
                    type={hide ? 'password' : 'text'}
                    name='backupPassword'
                    placeholder='Backup password'
                    autoCapitalize='none'
                    autoFocus
                    value={values.backupPassword}
                    onChange={handleChange('backupPassword')}
                    onBlur={handleBlur('backupPassword')}
                  />
                  <IconButton
                    onClick={() => setHide(prev => !prev)}
                    size='small'
                    aria-label={hide ? 'Show password' : 'Hide password'}
                    sx={{color: 'var(--gray)'}}>
                    {hide ? (
                      <Visibility fontSize='small' />
                    ) : (
                      <VisibilityOff fontSize='small' />
                    )}
                  </IconButton>
                </div>
                {errors.backupPassword && touched.backupPassword && (
                  <p className={s.errorText}>{errors.backupPassword}</p>
                )}

                {isCreate && (
                  <>
                    <div className={s.inputWrapper}>
                      <input
                        className={s.input}
                        type={hideConfirm ? 'password' : 'text'}
                        name='backupPasswordConfirm'
                        placeholder='Confirm backup password'
                        autoCapitalize='none'
                        value={values.backupPasswordConfirm}
                        onChange={handleChange('backupPasswordConfirm')}
                        onBlur={handleBlur('backupPasswordConfirm')}
                      />
                      <IconButton
                        onClick={() => setHideConfirm(prev => !prev)}
                        size='small'
                        aria-label={
                          hideConfirm ? 'Show password' : 'Hide password'
                        }
                        sx={{color: 'var(--gray)'}}>
                        {hideConfirm ? (
                          <Visibility fontSize='small' />
                        ) : (
                          <VisibilityOff fontSize='small' />
                        )}
                      </IconButton>
                    </div>
                    {errors.backupPasswordConfirm &&
                      touched.backupPasswordConfirm && (
                        <p className={s.errorText}>
                          {errors.backupPasswordConfirm}
                        </p>
                      )}
                  </>
                )}

                {!!errorText && <p className={s.errorText}>{errorText}</p>}

                <button className={s.submitButton} type='submit'>
                  {isCreate ? 'Set Password' : 'Unlock Backup'}
                </button>
              </form>
            )}
          </Formik>
        </div>
      </Box>
    </Modal>
  );
};

export default ModalBackupPassword;
