'use client';
import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
} from 'react';
import {Formik} from 'formik';
import styles from './VerifyLoginScreen.module.css';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import {validationSchemaLogin} from 'utils/validationSchema';
import {useRouter} from 'next/navigation';
// import {
//   logInSuccess,
//   fingerprintAuthSuccess,
//   loadingOff,
//   loadingOn,
// } from 'dok-wallet-blockchain-networks/redux/auth/authSlice';

// import {validationSchemaLogin} from 'utils/validationSchema';
// import {isFingerprint} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
// import FingerprintScanner from 'react-native-fingerprint-scanner';
// import {IS_IOS, useFloatingHeight} from 'dok-wallet-blockchain-networks/service/dimensions';
// import {ThemeContext} from '../../../../ThemeContext';
// import myStyles from './LoginScreenStyles';
import {
  loadingOff,
  logInSuccess,
} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {useDispatch, useSelector} from 'react-redux';
import {getUserPassword} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {
  selectAllWallets,
  selectCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import GoBackButton from 'components/GoBackButton';
import {getAppSubTitle} from 'whitelabel/whiteLabelInfo';
import {ThemeContext} from 'theme/ThemeContext';
// import RNScreenshotPrevent from 'react-native-screenshot-prevent';

const VerifyLoginScreen = () => {
  const [hide, setHide] = useState(true);
  const [wrong, setWrong] = useState(false);
  const router = useRouter();
  //   const {theme} = useContext(ThemeContext);
  //   const styles = myStyles(theme);

  const dispatch = useDispatch();
  //   const [wrong, setWrong] = useState(false);
  const storePassword = useSelector(getUserPassword);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const buttonRef = useRef();
  //   const fingerprint = useSelector(isFingerprint);
  //   const isFinger = useSelector(getFingerprintAuth);
  //   const floatingBtnHeight = useFloatingHeight();

  //   useEffect(() => {
  //     RNScreenshotPrevent.enabled(true);
  //     if (IS_IOS && !__DEV__) {
  //       RNScreenshotPrevent.enableSecurediv();
  //     }
  //     return () => {

  //     };
  //   }, []);

  //   useEffect(() => {
  //     dispatch(loadingOff());
  //     setTimeout(() => {
  //       handleFingerprintAuth();
  //     }, 200);
  //   }, [dispatch, handleFingerprintAuth]);

  //   useEffect(() => {
  //     if (!isFinger) {
  //       handleFingerprintAuth();
  //     }
  //   }, [isFinger, handleFingerprintAuth]);

  //   const handleFingerprintAuth = useCallback(async () => {
  //     if (fingerprint) {
  //       try {
  //         const isAuth = await FingerprintScanner.authenticate({
  //           description: 'Unlock Dok Wallet with your fingerprint',
  //         });

  //         dispatch(fingerprintAuthSuccess(isAuth));
  //         if (hasWallet()) {
  //           console.log('hasWallet: in login', hasWallet());
  //           dispatch(loadingOn());
  //           setTimeout(() => {
  //             navigation.reset({
  //               index: 0,
  //               routes: [{name: 'Sidebar'}],
  //             });
  //             dispatch(loadingOff());
  //           }, 200);
  //         } else {
  //           dispatch(loadingOn());
  //           navigation.reset({
  //             index: 0,
  //             routes: [{name: 'ResetWallet', params: {isFromOnBoarding: true}}],
  //           });
  //         }
  //       } catch (error) {
  //         if (error.name === 'SystemCancel') {
  //           console.log('Authentication was canceled by the system');
  //         } else {
  //           console.log('Error checking fingerprint settings:', error);
  //         }
  //       } finally {
  //         FingerprintScanner.release();
  //       }
  //     }
  //   }, [dispatch, fingerprint, navigation, hasWallet]);

  const onClickLogin = useCallback(
    values => {
      if (storePassword === values.password) {
        router.push(
          `/wallet/${currentWalletClientId}/verify/verify-create?showSeedPhrase=true`,
        );
      } else {
        setWrong(true);
        dispatch(loadingOff());
      }
    },
    [dispatch, router, storePassword, currentWalletClientId],
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
        <div className={styles.goBack}>
          <GoBackButton />
        </div>
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
                Verify
              </button>
            </form>
          )}
        </Formik>
      </div>
    </>
  );
};

export default VerifyLoginScreen;
