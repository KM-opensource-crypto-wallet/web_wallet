'use client';

import React, {useState, useEffect, useCallback, useRef} from 'react';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {validationSchemaFingerprintVerification} from 'utils/validationSchema';
import {Formik} from 'formik';
import HomeSheet from 'components/Home/HomeSheet';
import GeneralButton from 'components/Button';
import {EyeIcon, KeyIcon} from 'components/Home/HomeIcons';
import s from './ModalConfirmTransaction.module.css';

// Password check before a sensitive action (sending, revealing a private key,
// custom derivation). Bottom sheet on phones, centred dialog from 600px up.
const ModalConfirmTransaction = ({visible, hideModal, onSuccess}) => {
  const [wrong, setWrong] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Guards against double-submit (Enter key + click racing, or rapid clicks)
  // firing onSuccess twice and broadcasting the transaction twice.
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      isSubmittingRef.current = false;
    }
  }, [visible]);

  const triggerSuccess = useCallback(() => {
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    onSuccess && onSuccess();
  }, [onSuccess]);

  // One PBKDF2 (600k, in a worker) per confirm: the KDF is the verifier.
  const onSubmit = async values => {
    if (verifying) {
      return;
    }
    setVerifying(true);
    try {
      const ok = await vault.verifyPassword(values.currentPassword);
      if (ok) {
        triggerSuccess();
      } else {
        setWrong(true);
      }
    } catch (e) {
      console.error('Error verifying password', e);
      setWrong(true);
    } finally {
      setVerifying(false);
    }
  };

  const close = () => {
    hideModal(false);
    setWrong(false);
    setShowPassword(false);
  };

  return (
    <HomeSheet
      visible={visible}
      onClose={close}
      title='Confirm with password'
      labelId='confirm-password-title'>
      <Formik
        enableReinitialize={true}
        initialValues={{
          currentPassword: '',
        }}
        validationSchema={validationSchemaFingerprintVerification}
        onSubmit={onSubmit}>
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
        }) => {
          const error = wrong
            ? 'Wrong password. Try again.'
            : touched.currentPassword && errors.currentPassword
              ? errors.currentPassword
              : null;
          return (
            <form
              className={s.form}
              noValidate
              onSubmit={event => {
                event.preventDefault();
                handleSubmit();
              }}>
              <div className={s.intro}>
                <span className={s.introIcon}>
                  <KeyIcon size={20} />
                </span>
                <p className={s.introText}>
                  Enter your wallet password to confirm. It never leaves this
                  device.
                </p>
              </div>

              <div className={s.field}>
                <label htmlFor='confirm-password' className={s.label}>
                  Password
                </label>
                <div
                  className={`${s.inputBox} ${error ? s.inputBoxError : ''}`}>
                  <input
                    id='confirm-password'
                    className={s.input}
                    type={showPassword ? 'text' : 'password'}
                    name='currentPassword'
                    placeholder='Your wallet password'
                    autoComplete='current-password'
                    onChange={event => {
                      if (wrong) setWrong(false);
                      handleChange('currentPassword')(event);
                    }}
                    onBlur={handleBlur('currentPassword')}
                    value={values.currentPassword}
                    aria-invalid={!!error}
                    autoFocus={true}
                  />
                  <button
                    type='button'
                    className={s.reveal}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    onClick={() => setShowPassword(v => !v)}>
                    <EyeIcon size={18} off={showPassword} />
                  </button>
                </div>
                {error ? (
                  <p className={s.error} role='alert'>
                    {error}
                  </p>
                ) : null}
              </div>

              <div className={s.actions}>
                <GeneralButton
                  variant='secondary'
                  fullWidth
                  onClick={close}
                  disabled={verifying}>
                  Cancel
                </GeneralButton>
                <GeneralButton
                  type='submit'
                  fullWidth
                  loading={verifying}
                  loadingLabel='Verifying…'>
                  Confirm
                </GeneralButton>
              </div>
            </form>
          );
        }}
      </Formik>
    </HomeSheet>
  );
};

export default ModalConfirmTransaction;
