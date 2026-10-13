'use client';
import React from 'react';
import {Formik} from 'formik';
import useLogin from 'src/hooks/auth/loginRegistration/useLogin';
import ModalResetAllWallets from 'components/ModalResetAllWallets';
import AuthLayout, {
  InfoNote,
  NonCustodialNote,
  PasswordInput,
  SubmitButton,
  authStyles as styles,
} from 'components/AuthLayout';
import ModalInfo from 'src/components/ModalInfo';
import {Constants} from 'src/utils/common';
import GeneralButton from 'src/components/Button';

const LoginScreen = () => {
  const {
    initialValues,
    validationSchema,
    handleSubmit,
    wrong,
    clearWrong,
    blocked,
    showResetModal,
    openResetModal,
    closeResetModal,
    lastAttempt,
    closeLastAttempt,
  } = useLogin();

  return (
    <>
      <AuthLayout
        title='Welcome back'
        subtitle='Enter your password to unlock your wallet.'>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}>
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
            values,
            errors,
            touched,
          }) => {
            const fieldError = errors.password && touched.password;
            const hasError = fieldError || wrong || !!blocked;
            return (
              <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <div className={styles.card}>
                  <div>
                    <label htmlFor='password' className={styles.label}>
                      Password
                    </label>
                    <PasswordInput
                      id='password'
                      placeholder='Enter your password'
                      aria-label='Password'
                      autoFocus={true}
                      autoComplete='current-password'
                      invalid={hasError}
                      describedBy={hasError ? 'password-error' : undefined}
                      value={values.password}
                      onChange={e => {
                        clearWrong();
                        handleChange('password')(e);
                      }}
                      onBlur={handleBlur('password')}
                    />
                    <div id='password-error' role='alert'>
                      {fieldError ? (
                        <p className={styles.error}>{errors.password}</p>
                      ) : null}
                      {wrong === true && (
                        <p className={styles.error}>
                          You have entered an invalid password
                        </p>
                      )}
                      {blocked ? (
                        <p className={styles.error}>{blocked}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <InfoNote>
                  Your password can&apos;t be recovered. Without it, the only
                  way back in is to reset this device and restore your wallet
                  from its seed phrase.
                </InfoNote>

                <div className={styles.footer}>
                  <GeneralButton
                    type='submit'
                    variant='primary'
                    loading={isSubmitting}
                    loadingLabel={'Unlocking…'}>
                    Sign in
                  </GeneralButton>
                  <GeneralButton
                    variant='link'
                    className={styles.link}
                    onClick={openResetModal}>
                    Forgot password? Reset all wallets &amp; start over
                  </GeneralButton>
                  <NonCustodialNote />
                </div>
              </form>
            );
          }}
        </Formik>
      </AuthLayout>
      <ModalInfo
        visible={lastAttempt}
        title={Constants.lastAttempt.title}
        message={Constants.lastAttempt.subTitle}
        tone='danger'
        handleClose={closeLastAttempt}
      />

      <ModalResetAllWallets
        visible={showResetModal}
        onClose={closeResetModal}
      />
    </>
  );
};

export default LoginScreen;
