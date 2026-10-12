'use client';
import React from 'react';
import {Formik} from 'formik';
import useRegistration from 'src/hooks/auth/loginRegistration/useRegistration';
import AuthLayout, {
  InfoNote,
  NonCustodialNote,
  PasswordInput,
  authStyles,
} from 'components/AuthLayout';
import GeneralButton from 'src/components/Button';
import styles from './Registration.module.css';

const CheckIcon = ({size}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.5'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'>
    <path d='M20 6 9 17l-5-5' />
  </svg>
);

// import {loadingOn, signUpSuccess} from 'redux/auth/authSlice';
// import myStyles from './RegistrationScreenStyles';
// import {ThemeContext} from '../../../../ThemeContext';
// import {useDispatch} from 'redux/utils/useDispatch';
// import RNScreenshotPrevent from 'react-native-screenshot-prevent';
// import {useIsFocused} from '@react-navigation/native';

const RegistrationScreen = () => {
  const {initialValues, validationSchema, handleSubmit, getPasswordState} =
    useRegistration();

  // useEffect(() => {
  //   if (isFocused) {
  //     RNScreenshotPrevent.enabled(true);
  //     if (IS_IOS && !__DEV__) {
  //       RNScreenshotPrevent.enableSecureView();
  //     }
  //   } else {
  //     RNScreenshotPrevent.enabled(false);
  //   }
  // }, [isFocused]);

  return (
    <AuthLayout
      title='Create your password'
      subtitle='This password unlocks your wallet on this device. It never leaves this browser.'>
      <div className={styles.scope}>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}>
          {({values, handleChange, handleBlur, handleSubmit, isSubmitting}) => {
            const {password, passConfirm} = values;
            const {rules, strength, matched, mismatch, canSubmit} =
              getPasswordState(values);
            return (
              <form
                className={authStyles.form}
                onSubmit={handleSubmit}
                noValidate>
                <div className={authStyles.card}>
                  <div>
                    <label htmlFor='password' className={authStyles.label}>
                      New password
                    </label>
                    <PasswordInput
                      id='password'
                      placeholder='Enter new password'
                      aria-label='New password'
                      autoFocus={true}
                      autoComplete='new-password'
                      describedBy='password-strength password-rules'
                      value={password}
                      onChange={handleChange('password')}
                      onBlur={handleBlur('password')}
                    />
                    <div
                      id='password-strength'
                      className={styles.strength}
                      data-score={strength.score}>
                      <div className={styles.segments} aria-hidden='true'>
                        <span />
                        <span />
                        <span />
                      </div>
                      <span className={styles.strengthLabel}>
                        {strength.label}
                      </span>
                    </div>
                    <ul id='password-rules' className={styles.rules}>
                      {rules.map(rule => (
                        <li
                          key={rule.label}
                          className={`${styles.rule} ${
                            rule.met ? styles.ruleMet : ''
                          }`}>
                          {rule.met ? (
                            <CheckIcon size={15} />
                          ) : (
                            <svg
                              width='15'
                              height='15'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                              aria-hidden='true'>
                              <circle cx='12' cy='12' r='8' />
                            </svg>
                          )}
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <label htmlFor='passConfirm' className={authStyles.label}>
                      Confirm password
                    </label>
                    <PasswordInput
                      id='passConfirm'
                      placeholder='Re-enter password'
                      aria-label='Confirm password'
                      autoComplete='new-password'
                      invalid={mismatch}
                      valid={matched}
                      adornment={
                        matched ? (
                          <span className={styles.matchIcon}>
                            <CheckIcon size={20} />
                          </span>
                        ) : null
                      }
                      describedBy={mismatch ? 'confirm-error' : undefined}
                      value={passConfirm}
                      onChange={handleChange('passConfirm')}
                      onBlur={handleBlur('passConfirm')}
                    />
                    {mismatch ? (
                      <p
                        id='confirm-error'
                        className={authStyles.error}
                        role='alert'>
                        Passwords don&apos;t match yet
                      </p>
                    ) : null}
                  </div>
                </div>

                <InfoNote>
                  We can&apos;t recover this password. If you forget it,
                  you&apos;ll need your seed phrase to restore the wallet.
                </InfoNote>

                <div className={authStyles.footer}>
                  <GeneralButton
                    type='submit'
                    fullWidth
                    loading={isSubmitting}
                    loadingLabel='Creating wallet…'
                    disabled={!canSubmit}>
                    Create account
                  </GeneralButton>
                  <NonCustodialNote />
                </div>
              </form>
            );
          }}
        </Formik>
      </div>
    </AuthLayout>
  );
};

export default RegistrationScreen;
