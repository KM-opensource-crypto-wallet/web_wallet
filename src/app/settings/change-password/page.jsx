'use client';
import React, {useRef, useState, useCallback} from 'react';
import styles from './ChangePassword.module.css';
import {Formik} from 'formik';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Input from '@mui/material/Input';
import IconButton from '@mui/material/IconButton';
import {validationSchemaChangePassword} from 'utils/validationSchema';
import GoBackButton from 'components/GoBackButton';
import {useDispatch} from 'react-redux';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {VAULT_ERROR_CODES} from 'dok-wallet-blockchain-networks/security/errors';
import {captureError} from 'services/logger';
import {toast} from 'react-toastify';
import {useRouter} from 'next/navigation';
import {changePasswordSuccess} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';

const ChangePassword = () => {
  const [hideCurrentPassword, setHideCurrentPassword] = useState(true);
  const [hideNewPassword, setHideNewPassword] = useState(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState(true);
  const [wrong, setWrong] = useState(false);
  const router = useRouter();

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
    <div className={styles.container}>
      <GoBackButton />
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
          <form className={styles.formInput} onSubmit={handleSubmit}>
            <div className={styles.inputsList}>
              <FormControl sx={{m: 1}} variant='standard'>
                <InputLabel
                  sx={{
                    color:
                      (errors.currentPassword && touched.currentPassword) ||
                      wrong
                        ? 'red'
                        : 'var(--borderActiveColor)',
                  }}
                  focused={false}>
                  Current Password
                </InputLabel>
                <Input
                  fullWidth
                  autoFocus={true}
                  id='currentPassword'
                  type={!hideCurrentPassword ? 'text' : 'password'}
                  name='currentPassword'
                  onChange={handleChange('currentPassword')}
                  onKeyDown={onCurrentPasswordKeyDown}
                  onBlur={() => {
                    setWrong(false);
                    handleBlur('currentPassword');
                  }}
                  value={values.currentPassword}
                  endAdornment={
                    <InputAdornment position='end'>
                      <IconButton
                        aria-label='toggle password visibility'
                        onClick={() =>
                          setHideCurrentPassword(!hideCurrentPassword)
                        }
                        edge='end'
                        sx={{
                          '&  .MuiSvgIcon-root': {
                            color: 'var(--borderActiveColor) ',
                          },
                        }}>
                        {!hideCurrentPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  }
                  label='Current Password'
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        errors.currentPassword && touched.currentPassword
                          ? 'red'
                          : 'var(--sidebarIcon)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        errors.currentPassword && touched.currentPassword
                          ? 'red'
                          : 'var(--borderActiveColor)',
                    },
                    '& .MuiInputLabel-outlined': {
                      color:
                        errors.currentPassword && touched.currentPassword
                          ? 'red'
                          : 'var(--sidebarIcon)',
                    },
                  }}
                />
              </FormControl>
              {errors.currentPassword && touched.currentPassword && (
                <p className={styles.textConfirm}>{errors.currentPassword}</p>
              )}
              {wrong === true && (
                <p className={styles.textWarning}>
                  * You have entered an invalid password
                </p>
              )}
              <FormControl sx={{m: 1}} variant='standard'>
                <InputLabel
                  sx={{
                    color:
                      errors.newPassword && touched.newPassword
                        ? 'red'
                        : 'var(--borderActiveColor)',
                  }}
                  focused={false}>
                  New Password
                </InputLabel>
                <Input
                  inputRef={newPasswordRef}
                  onKeyDown={onNewPasswordKeyDown}
                  fullWidth
                  id='newPassword'
                  type={!hideNewPassword ? 'text' : 'password'}
                  name='newPassword'
                  onChange={handleChange('newPassword')}
                  onBlur={handleBlur('newPassword')}
                  value={values.newPassword}
                  endAdornment={
                    <InputAdornment position='end'>
                      <IconButton
                        aria-label='toggle password visibility'
                        onClick={() => setHideNewPassword(!hideNewPassword)}
                        edge='end'
                        sx={{
                          '&  .MuiSvgIcon-root': {
                            color: 'var(--borderActiveColor) ',
                          },
                        }}>
                        {!hideNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label='New Password'
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        errors.newPassword && touched.newPassword
                          ? 'red'
                          : 'var(--sidebarIcon)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        errors.newPassword && touched.newPassword
                          ? 'red'
                          : 'var(--borderActiveColor)',
                    },
                    '& .MuiInputLabel-outlined': {
                      color:
                        errors.newPassword && touched.newPassword
                          ? 'red'
                          : 'var(--sidebarIcon)',
                    },
                  }}
                />
              </FormControl>
              {errors.newPassword && touched.newPassword && (
                <p className={styles.textConfirm}>{errors.newPassword}</p>
              )}

              <FormControl sx={{m: 1}} variant='standard'>
                <InputLabel
                  sx={{
                    color:
                      errors.retypePassword && touched.retypePassword
                        ? 'red'
                        : 'var(--borderActiveColor)',
                  }}
                  focused={false}>
                  New Password
                </InputLabel>
                <Input
                  inputRef={confirmPasswordRef}
                  onKeyDown={onConfirmPasswordKeyDown}
                  fullWidth
                  id='retypePassword'
                  type={!hideConfirmPassword ? 'text' : 'password'}
                  name='retypePassword'
                  onChange={handleChange('retypePassword')}
                  onBlur={handleBlur('retypePassword')}
                  value={values.retypePassword}
                  endAdornment={
                    <InputAdornment position='end'>
                      <IconButton
                        aria-label='toggle password visibility'
                        onClick={() =>
                          setHideConfirmPassword(!hideConfirmPassword)
                        }
                        edge='end'
                        sx={{
                          '&  .MuiSvgIcon-root': {
                            color: 'var(--borderActiveColor) ',
                          },
                        }}>
                        {!hideConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  }
                  label='New Password'
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        errors.retypePassword && touched.retypePassword
                          ? 'red'
                          : 'var(--sidebarIcon)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        errors.retypePassword && touched.retypePassword
                          ? 'red'
                          : 'var(--borderActiveColor)',
                    },
                    '& .MuiInputLabel-outlined': {
                      color:
                        errors.retypePassword && touched.retypePassword
                          ? 'red'
                          : 'var(--sidebarIcon)',
                    },
                  }}
                />
              </FormControl>
              {errors.retypePassword && touched.retypePassword && (
                <p className={styles.textConfirm}>{errors.retypePassword}</p>
              )}
            </div>

            <button
              ref={buttonRef}
              type='submit'
              disabled={isValid ? false : true}
              className={styles.button}
              style={{
                opacity: !isValid && 0.5,
              }}>
              Update password
            </button>
          </form>
        )}
      </Formik>
    </div>
  );
};

export default ChangePassword;
