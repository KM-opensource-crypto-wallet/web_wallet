'use client';
import styles from './Registration.module.css';
import React, {useRef, useState, useCallback} from 'react';
import {Formik} from 'formik';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import {validationSchemaRegistration} from 'utils/validationSchema';
import {useRouter, useSearchParams} from 'next/navigation';
import {VerifyInfoModal} from 'components/VerifyInfo';
import ModalConfirm from 'components/ModalConfirm';
import {
  loadingOff,
  loadingOn,
  signUpSuccess,
} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {useDispatch} from 'react-redux';
import {UNLOCK_ERROR_CODES, createAccount} from 'security/unlockFlow';
import {captureError} from 'services/logger';
import {toast} from 'react-toastify';

// import {loadingOn, signUpSuccess} from 'redux/auth/authSlice';
// import myStyles from './RegistrationScreenStyles';
// import {ThemeContext} from '../../../../ThemeContext';
// import {useDispatch} from 'redux/utils/useDispatch';
// import RNScreenshotPrevent from 'react-native-screenshot-prevent';
// import {useIsFocused} from '@react-navigation/native';

const RegistrationScreen = () => {
  const [hide, setHide] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const confirmPasswordRef = useRef();
  const buttonRef = useRef();
  const searchParams = useSearchParams();
  // Wallets from earlier are still saved in this browser: 'found' offers the
  // restore, 'confirmDelete' is the second, explicit step before replacing.
  const [vaultPrompt, setVaultPrompt] = useState(null);
  const [pendingValues, setPendingValues] = useState(null);
  const searchString = searchParams ? `?${searchParams}` : '';

  // const {theme} = useContext(ThemeContext);
  // const styles = myStyles(theme);
  const dispatch = useDispatch();

  // The password never gets stored: it wraps a fresh vault key, and sealed
  // persistence opens under the key derived from it.
  const handleSubmit = async (values, options) => {
    dispatch(loadingOn());
    try {
      await dispatch(createAccount(values.password, options));
    } catch (error) {
      dispatch(loadingOff());
      if (error?.code === UNLOCK_ERROR_CODES.VAULT_EXISTS) {
        setPendingValues(values);
        setVaultPrompt('found');
        return;
      }
      if (error?.code === UNLOCK_ERROR_CODES.ACCOUNT_EXISTS) {
        // Reached registration with an account on this device (e.g. a typed
        // URL inside the auto-lock window): never replace its vault here.
        toast.error(error.message);
        router.replace(`/auth/login${searchParams ? `?${searchParams}` : ''}`);
        return;
      }
      captureError(error, {tags: {area: 'vault', op: 'create'}});
      toast.error(
        'Could not create secure storage for your wallet. Please try again.',
      );
      return;
    }
    dispatch(signUpSuccess());
    router.push(`/auth/reset-wallet${searchString}`);
  };

  const onRestoreInstead = () => {
    setVaultPrompt(null);
    setPendingValues(null);
    router.replace(`/auth/restore-from-device${searchString}`);
  };

  const onConfirmDelete = () => {
    const values = pendingValues;
    setVaultPrompt(null);
    setPendingValues(null);
    if (values) {
      handleSubmit(values, {discardExistingVault: true});
    }
  };

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

  /////////////////////////

  const onKeyDownForPassword = useCallback(e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      confirmPasswordRef.current?.focus?.();
    }
  }, []);

  const onKeyDownForConfirmPassword = useCallback(e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      buttonRef.current?.focus?.();
    }
  }, []);

  return (
    <>
      <div className={styles.container}>
        <div className={styles.formTitle}>
          <h2 className={styles.title}>Create account</h2>
          <p className={styles.text}>
            Enter and confirm your new password bellow
          </p>
        </div>
        <Formik
          initialValues={{password: '', passConfirm: ''}}
          validationSchema={validationSchemaRegistration}
          onSubmit={values => handleSubmit(values)}>
          {({
            values,
            handleChange,
            handleBlur,
            handleSubmit,
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
                  Enter new password
                </InputLabel>
                <OutlinedInput
                  autoFocus={true}
                  id='password'
                  type={!hide ? 'text' : 'password'}
                  name='password'
                  onChange={handleChange('password')}
                  onBlur={handleBlur('password')}
                  value={values.password}
                  onKeyDown={onKeyDownForPassword}
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
                  label='Enter new password'
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

              <FormControl sx={{m: 1, width: '25ch'}} variant='outlined'>
                <InputLabel
                  sx={{
                    color:
                      errors.passConfirm && touched.passConfirm
                        ? 'red'
                        : 'var(--borderActiveColor)',
                  }}
                  focused={false}>
                  Confirm new password
                </InputLabel>
                <OutlinedInput
                  inputRef={confirmPasswordRef}
                  onKeyDown={onKeyDownForConfirmPassword}
                  id='passConfirm'
                  type={!hideConfirm ? 'text' : 'password'}
                  name='passConfirm'
                  onChange={handleChange('passConfirm')}
                  onBlur={handleBlur('passConfirm')}
                  value={values.passConfirm}
                  endAdornment={
                    <InputAdornment position='end'>
                      <IconButton
                        aria-label='toggle password visibility'
                        onClick={() => setHideConfirm(!hideConfirm)}
                        edge='end'
                        sx={{
                          '&  .MuiSvgIcon-root': {
                            color: 'var(--borderActiveColor) ',
                          },
                        }}>
                        {!hideConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label='Confirm new password'
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        errors.passConfirm && touched.passConfirm
                          ? 'red'
                          : 'var(--sidebarIcon)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        errors.passConfirm && touched.passConfirm
                          ? 'red'
                          : 'var(--borderActiveColor)',
                    },
                    '& .MuiInputLabel-outlined': {
                      color:
                        errors.passConfirm && touched.passConfirm
                          ? 'red'
                          : 'var(--sidebarIcon)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--sidebarIcon) !important',
                    },
                  }}
                />
              </FormControl>
              {errors.passConfirm && touched.passConfirm ? (
                <p className={styles.textConfirm}>{errors.passConfirm}</p>
              ) : null}

              <button className={styles.button} type='submit' ref={buttonRef}>
                Create
              </button>
            </form>
          )}
        </Formik>
      </div>
      <ModalConfirm
        visible={vaultPrompt === 'found'}
        title='Wallets found on this device'
        description='Wallets from earlier are still saved in this browser. You can restore them with the password you used before.'
        yesButtonTitle='Restore wallets'
        noButtonTitle='Delete and start over'
        onPressYes={onRestoreInstead}
        onPressNo={() => setVaultPrompt('confirmDelete')}
      />
      <ModalConfirm
        visible={vaultPrompt === 'confirmDelete'}
        title='Delete saved wallets?'
        description='The saved wallets will be removed from this browser for good. Only continue if you have their recovery phrases or a backup.'
        yesButtonTitle='Delete'
        noButtonTitle='Cancel'
        onPressYes={onConfirmDelete}
        onPressNo={() => {
          setVaultPrompt(null);
          setPendingValues(null);
        }}
      />
    </>
  );
};

export default RegistrationScreen;
