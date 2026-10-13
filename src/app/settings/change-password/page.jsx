'use client';
import React, {useRef, useState, useCallback} from 'react';
import s from './ChangePassword.module.css';
import {Formik} from 'formik';
import {validationSchemaChangePassword} from 'utils/validationSchema';
import {useDispatch} from 'react-redux';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {VAULT_ERROR_CODES} from 'dok-wallet-blockchain-networks/security/errors';
import {captureError} from 'services/logger';
import {toast} from 'react-toastify';
import {useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {changePasswordSuccess} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon, EyeIcon, InfoIcon} from 'components/Home/HomeIcons';

// One password input with its label, show/hide toggle and error line.
const PasswordField = ({
  id,
  label,
  error,
  hidden,
  onToggle,
  inputRef,
  ...inputProps
}) => (
  <div className={s.field}>
    <label htmlFor={id} className={s.fieldLabel}>
      {label}
    </label>
    <div className={`${s.inputRow} ${error ? s.inputError : ''}`}>
      <input
        id={id}
        name={id}
        ref={inputRef}
        className={s.input}
        type={hidden ? 'password' : 'text'}
        autoComplete={
          id === 'currentPassword' ? 'current-password' : 'new-password'
        }
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      <button
        type='button'
        className={s.reveal}
        aria-label={hidden ? 'Show password' : 'Hide password'}
        onClick={onToggle}>
        <EyeIcon size={18} off={!hidden} />
      </button>
    </div>
    {error ? (
      <p id={`${id}-error`} className={s.error}>
        {error}
      </p>
    ) : null}
  </div>
);

const ChangePassword = () => {
  const [hideCurrentPassword, setHideCurrentPassword] = useState(true);
  const [hideNewPassword, setHideNewPassword] = useState(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState(true);
  const [wrong, setWrong] = useState(false);
  const router = useRouter();
  const t = useTranslations('settings');

  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const newPasswordRef = useRef();
  const buttonRef = useRef();
  const confirmPasswordRef = useRef();

  // Re-wraps the vault key under the new password; the current password is
  // enforced by the unwrap (previously a wrong one only set a flag — W3).
  const handleSubmit = async values => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await vault.changePassword(values.currentPassword, values.newPassword);
    } catch (error) {
      setBusy(false);
      if (error?.code === VAULT_ERROR_CODES.INVALID_PASSWORD) {
        setWrong(true);
        return;
      }
      captureError(error, {tags: {area: 'vault', op: 'change_password'}});
      toast.error('Password not updated: secure storage is unavailable.');
      return;
    }
    setBusy(false);
    setWrong(false);
    dispatch(changePasswordSuccess());
    toast.success('Password updated sucessfully. Please do login again');
    router.replace('/auth/login');
  };

  const onCurrentPasswordKeyDown = useCallback(e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      newPasswordRef.current?.focus?.();
    }
  }, []);

  const onNewPasswordKeyDown = useCallback(e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      confirmPasswordRef.current?.focus?.();
    }
  }, []);

  const onConfirmPasswordKeyDown = useCallback(e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      buttonRef.current?.focus?.();
    }
  }, []);

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <h1 className={s.title}>{t('changePassword')}</h1>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>

      <div className={s.column}>
        <Formik
          enableReinitialize={true}
          initialValues={{
            currentPassword: '',
            newPassword: '',
            retypePassword: '',
          }}
          validationSchema={validationSchemaChangePassword}
          onSubmit={handleSubmit}>
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            isValid,
          }) => (
            <form className={s.form} onSubmit={handleSubmit}>
              <div className={s.card}>
                <PasswordField
                  id='currentPassword'
                  label='Current password'
                  autoFocus={true}
                  hidden={hideCurrentPassword}
                  onToggle={() => setHideCurrentPassword(!hideCurrentPassword)}
                  error={
                    errors.currentPassword && touched.currentPassword
                      ? errors.currentPassword
                      : null
                  }
                  onChange={handleChange('currentPassword')}
                  onKeyDown={onCurrentPasswordKeyDown}
                  onBlur={e => {
                    setWrong(false);
                    handleBlur('currentPassword')(e);
                  }}
                  value={values.currentPassword}
                />
                {wrong === true && (
                  <p className={s.alert} role='alert'>
                    You have entered an invalid password
                  </p>
                )}

                <PasswordField
                  id='newPassword'
                  label='New password'
                  inputRef={newPasswordRef}
                  hidden={hideNewPassword}
                  onToggle={() => setHideNewPassword(!hideNewPassword)}
                  error={
                    errors.newPassword && touched.newPassword
                      ? errors.newPassword
                      : null
                  }
                  onChange={handleChange('newPassword')}
                  onKeyDown={onNewPasswordKeyDown}
                  onBlur={handleBlur('newPassword')}
                  value={values.newPassword}
                />

                <PasswordField
                  id='retypePassword'
                  label='Confirm new password'
                  inputRef={confirmPasswordRef}
                  hidden={hideConfirmPassword}
                  onToggle={() => setHideConfirmPassword(!hideConfirmPassword)}
                  error={
                    errors.retypePassword && touched.retypePassword
                      ? errors.retypePassword
                      : null
                  }
                  onChange={handleChange('retypePassword')}
                  onKeyDown={onConfirmPasswordKeyDown}
                  onBlur={handleBlur('retypePassword')}
                  value={values.retypePassword}
                />
              </div>

              <p className={s.note}>
                <InfoIcon size={16} />
                <span>
                  You&apos;ll be signed out and asked to log in again with the
                  new password.
                </span>
              </p>

              <GeneralButton
                ref={buttonRef}
                type='submit'
                fullWidth
                disabled={!isValid}
                loading={busy}
                loadingLabel='Updating…'>
                Update password
              </GeneralButton>
            </form>
          )}
        </Formik>
      </div>
    </main>
  );
};

export default ChangePassword;
