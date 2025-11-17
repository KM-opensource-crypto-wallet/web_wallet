'use client';
import React, {useState, useCallback, useRef} from 'react';
import {Formik} from 'formik';
import styles from './LoginScreen.module.css';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import {validationSchemaLogin} from 'utils/validationSchema';
import ModalReset from 'components/ModalReset';
import {useRouter, useSearchParams} from 'next/navigation';
import {
  handleAttempts,
  loadingOff,
  logInSuccess,
  resetAttempts,
} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {useDispatch, useSelector} from 'react-redux';
import {
  getAttempts,
  getIsLocked,
  getMaxAttempt,
  getUserPassword,
} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {selectAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {refreshCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {getAppSubTitle} from 'whitelabel/whiteLabelInfo';
import {isWalletReset} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import ModalInfo from 'src/components/ModalInfo';
import {Constants} from 'src/utils/common';
import {showToast} from 'src/utils/toast';

const LoginScreen = () => {
  const [hide, setHide] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [wrong, setWrong] = useState(false);
  const router = useRouter();
  const buttonRef = useRef();
  const dispatch = useDispatch();
  const storePassword = useSelector(getUserPassword);
  const allWallets = useSelector(selectAllWallets);
  const rateLimitCheck = useSelector(isWalletReset);
  const [lastAttempt, setLastAttempt] = useState(false);
  const searchParams = useSearchParams();

  const attempts = useSelector(getAttempts);
  const isLocked = useSelector(getIsLocked);
  const MAX_ATTEMPT = useSelector(getMaxAttempt);

  const hasWallet = useCallback(() => {
    return allWallets?.length !== 0;
  }, [allWallets]);

  const handleReset = useCallback(() => {
    setShowResetModal(true);
  }, []);

  const onClickLogin = useCallback(
    async values => {
      if (storePassword === values.password) {
        dispatch(logInSuccess(values.password));
        if (rateLimitCheck) {
          dispatch(resetAttempts());
        }
        if (hasWallet()) {
          const redirectRoute = searchParams?.get('redirectRoute');
          let searchParamsString = '';
          for (const key of searchParams.keys()) {
            if (key !== 'redirectRoute') {
              searchParamsString += `${key}=${searchParams.get(key)}&`;
            }
          }
          router.replace(
            redirectRoute
              ? `${redirectRoute}${
                  searchParamsString ? '?' + searchParamsString : ''
                }`
              : `/home${searchParamsString ? '?' + searchParamsString : ''}`,
          );
          dispatch(refreshCoins());
        } else {
          router.replace('/auth/reset-wallet');
        }
      } else if (rateLimitCheck) {
        const failureCount = attempts.length;
        const attemptsLeft = MAX_ATTEMPT - failureCount;
        // NOTE: show warning pop case
        if (attemptsLeft === 1) {
          setLastAttempt(true);
        } else if (attemptsLeft <= 0 && isLocked) {
          showToast({
            type: 'warningToast',
            title: 'Wallet Deleted',
            message: 'Too many failed login attempts',
          });
        } else {
          showToast({
            type: 'warningToast',
            title: 'Invalid password',
            message: `${attemptsLeft} Attempts left`,
          });
          setWrong(true);
          dispatch(loadingOff());
        }
        dispatch(handleAttempts({router}));

        setWrong(true);
        dispatch(loadingOff());
      } else {
        setWrong(true);
        dispatch(loadingOff());
      }
    },
    [
      MAX_ATTEMPT,
      attempts.length,
      dispatch,
      hasWallet,
      isLocked,
      rateLimitCheck,
      router,
      searchParams,
      storePassword,
    ],
  );

  const onKeyDown = useCallback(e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      buttonRef.current?.focus?.();
    }
  }, []);

  return (
    <>
      <div className={styles.container}>
        <p className={styles.brand}>{getAppSubTitle()}</p>
        <p className={styles.title}>Sign in</p>
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
          }) => (
            <form className={styles.formInput} onSubmit={handleSubmit}>
              <FormControl sx={{m: 1, width: '25ch'}} variant='outlined'>
                <InputLabel
                  sx={{
                    color:
                      errors.password && touched.password
                        ? 'red'
                        : 'var(--borderActiveColor)',
                  }}
                  focused={false}>
                  Password
                </InputLabel>
                <OutlinedInput
                  autoFocus={true}
                  id='password'
                  onKeyDown={onKeyDown}
                  type={!hide ? 'text' : 'password'}
                  name='password'
                  onChange={handleChange('password')}
                  onBlur={handleBlur('password')}
                  value={values.password}
                  endAdornment={
                    <InputAdornment position='end'>
                      <IconButton
                        aria-label='toggle password visibility'
                        onClick={() => setHide(!hide)}
                        edge='end'
                        sx={{
                          '&  .MuiSvgIcon-root': {
                            color: 'var(--borderActiveColor) ',
                          },
                        }}>
                        {!hide ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label='Password'
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        errors.password && touched.password
                          ? 'red'
                          : 'var(--sidebarIcon)',
                    },

                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        errors.password && touched.password
                          ? 'red'
                          : 'var(--borderActiveColor)',
                    },

                    '& .MuiInputLabel-outlined': {
                      color:
                        errors.password && touched.password
                          ? 'red'
                          : 'var(--sidebarIcon)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--sidebarIcon) !important',
                    },
                  }}
                />
              </FormControl>

              {errors.password && touched.password ? (
                <p className={styles.textConfirm}>{errors.password}</p>
              ) : null}
              {wrong === true && (
                <p className={styles.textWarning}>
                  * You have entered an invalid password
                </p>
              )}

              <button className={styles.button} type='submit' ref={buttonRef}>
                Sign in
              </button>
            </form>
          )}
        </Formik>
        <div className={styles.reset}>
          <p className={styles.resetTitle}>Forgot you password?</p>
          <button
            className={styles.resetText}
            onClick={handleReset}
            type='submit'>
            Reset your wallet by using you seed phrase
          </button>
        </div>
      </div>
      <ModalInfo
        visible={lastAttempt}
        title={Constants.lastAttempt.title}
        message={Constants.lastAttempt.subTitle}
        handleClose={() => setLastAttempt(false)}
      />

      <ModalReset
        visible={showResetModal}
        hideModal={setShowResetModal}
        page={'Forgot'}
      />
    </>
  );
};

export default LoginScreen;
