'use client';
import {walletRoutes} from 'utils/routes';
import React, {useState, useCallback, useRef} from 'react';
import {Formik} from 'formik';
import styles from './VerifyLoginScreen.module.css';
import {validationSchemaLogin} from 'utils/validationSchema';
import {useRouter} from 'next/navigation';
import {loadingOff} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {useDispatch, useSelector} from 'react-redux';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getAppSubTitle} from 'whitelabel/whiteLabelInfo';
import GeneralButton from 'components/Button';
import Screen from 'components/Screen';
import {EyeIcon} from 'components/Home/HomeIcons';
import {PhraseIcon} from 'app/settings/SettingsIcons';

const VerifyLoginScreen = () => {
  const [hide, setHide] = useState(true);
  const [wrong, setWrong] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const buttonRef = useRef();

  const onClickLogin = useCallback(
    async values => {
      // Verified by unwrapping the vault key, not by comparing a stored value.
      const ok = await vault.verifyPassword(values.password).catch(() => false);
      if (ok) {
        router.push(
          `${walletRoutes.verifyCreate(currentWalletClientId)}?showSeedPhrase=true`,
        );
      } else {
        setWrong(true);
        dispatch(loadingOff());
      }
    },
    [dispatch, router, currentWalletClientId],
  );

  const onKeyDown = useCallback(e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      buttonRef.current?.focus?.();
    }
  }, []);

  return (
    <Screen className={styles.page} title='Show seed phrase'>
      <div className={styles.column}>
        <div className={styles.intro}>
          <span className={styles.introIcon}>
            <PhraseIcon size={26} />
          </span>
          <p className={styles.brand}>{getAppSubTitle()}</p>
          <h2 className={styles.heading}>Sign in</h2>
          <p className={styles.lead}>
            Enter your password to view your seed phrase.
          </p>
        </div>

        <Formik
          initialValues={{password: ''}}
          validationSchema={validationSchemaLogin}
          onSubmit={onClickLogin}>
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            isSubmitting,
          }) => {
            const hasError = !!(errors.password && touched.password) || wrong;
            return (
              <form className={styles.card} onSubmit={handleSubmit} noValidate>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor='password'>
                    Password
                  </label>
                  <div
                    className={`${styles.inputBox} ${
                      hasError ? styles.inputBoxError : ''
                    }`}>
                    <input
                      autoFocus={true}
                      id='password'
                      className={styles.input}
                      onKeyDown={onKeyDown}
                      type={!hide ? 'text' : 'password'}
                      name='password'
                      autoComplete='current-password'
                      placeholder='Enter your password'
                      aria-invalid={hasError || undefined}
                      aria-describedby={hasError ? 'password-error' : undefined}
                      onChange={handleChange('password')}
                      onBlur={handleBlur('password')}
                      value={values.password}
                    />
                    <button
                      type='button'
                      className={styles.reveal}
                      aria-label={hide ? 'Show password' : 'Hide password'}
                      aria-pressed={!hide}
                      onClick={() => setHide(!hide)}>
                      <EyeIcon size={18} off={!hide} />
                    </button>
                  </div>
                  <div id='password-error' aria-live='polite'>
                    {errors.password && touched.password ? (
                      <p className={styles.error}>{errors.password}</p>
                    ) : null}
                    {wrong === true && (
                      <p className={styles.error}>
                        * You have entered an invalid password
                      </p>
                    )}
                  </div>
                </div>

                <GeneralButton
                  type='submit'
                  ref={buttonRef}
                  fullWidth
                  className={styles.submit}
                  loading={isSubmitting}
                  loadingLabel='Verifying'>
                  Verify
                </GeneralButton>
              </form>
            );
          }}
        </Formik>
      </div>
    </Screen>
  );
};

export default VerifyLoginScreen;
