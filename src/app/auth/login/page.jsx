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
  setLastAttempt,
} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {useDispatch, useSelector} from 'react-redux';
import {
  getAttempts,
  getLastAttempt,
  getMaxAttempt,
} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {
  UNLOCK_ERROR_CODES,
  isInvalidPassword,
  unlockWithPassword,
} from 'security/unlockFlow';
import {captureError} from 'services/logger';
import {store} from 'redux/store';
import {resolvePostUnlockRoute} from 'utils/postUnlockRoute';
import {refreshCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {getAppSubTitle} from 'whitelabel/whiteLabelInfo';
import {isWalletReset} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import ModalInfo from 'src/components/ModalInfo';
import {Constants} from 'src/utils/common';
import {setLastActiveTime} from 'utils/localStorageData';
import {skipLockOnNextLoad} from 'utils/lockScreen';

// Long enough for the replayed navigation to settle (or hard-reload), short
// enough that a later manual reload still locks.
const REPLAY_SKIP_LOCK_TTL_MS = 10000;

const LoginScreen = () => {
  const [hide, setHide] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [wrong, setWrong] = useState(false);
  // A problem that must not be dismissed as "wrong password": wallets without
  // keys in the vault, or secure storage unavailable.
  const [blocked, setBlocked] = useState(null);
  const router = useRouter();
  const buttonRef = useRef();
  const dispatch = useDispatch();
  const rateLimitCheck = useSelector(isWalletReset);
  const lastAttempt = useSelector(getLastAttempt);
  const searchParams = useSearchParams();

  const attempts = useSelector(getAttempts);
  const MAX_ATTEMPT = useSelector(getMaxAttempt);

  const handleReset = useCallback(() => {
    setShowResetModal(true);
  }, []);

  const onClickLogin = useCallback(
    async values => {
      let unlocked = false;
      try {
        // "Correct password" = the vault key unwrapped; nothing is compared.
        // This also rehydrates the sealed slices and re-enables persistence.
        await dispatch(unlockWithPassword(values.password));
        unlocked = true;
      } catch (error) {
        if (!isInvalidPassword(error)) {
          if (error?.code === UNLOCK_ERROR_CODES.MISSING_SECRETS) {
            setBlocked(error.message);
          } else {
            captureError(error, {tags: {area: 'auth', op: 'unlock_password'}});
            setBlocked(
              'Your wallet could not be unlocked because its secure storage is unavailable. Please reload the page.',
            );
          }
          dispatch(loadingOff());
          return;
        }
      }
      if (unlocked) {
        dispatch(logInSuccess());
        setLastActiveTime();
        if (rateLimitCheck) {
          dispatch(resetAttempts());
        }
        // Read the store now, not the selector values from render: the sealed
        // wallets slice was empty until the unlock above rehydrated it.
        const {route, hasWallet, replayed} = resolvePostUnlockRoute(
          store.getState(),
          searchParams,
        );
        if (replayed) {
          // An unknown deep link loads the 404 page as a new document, which
          // would lock again immediately and loop back here.
          skipLockOnNextLoad({ttlMs: REPLAY_SKIP_LOCK_TTL_MS});
        }
        router.replace(route);
        if (hasWallet) {
          dispatch(refreshCoins());
        }
      } else if (rateLimitCheck) {
        dispatch(handleAttempts({router}));
        setWrong(true);
        dispatch(loadingOff());
      } else {
        setWrong(true);
        dispatch(loadingOff());
      }
    },
    [dispatch, rateLimitCheck, router, searchParams],
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
              {blocked ? <p className={styles.textWarning}>{blocked}</p> : null}

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
        handleClose={() => dispatch(setLastAttempt(false))}
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
