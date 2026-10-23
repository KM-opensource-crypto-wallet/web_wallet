'use client';
import styles from '../registration/Registration.module.css';
import localStyles from './RestoreFromDevice.module.css';
import React, {useState} from 'react';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import {useRouter, useSearchParams} from 'next/navigation';
import {useDispatch} from 'react-redux';
import {
  loadingOff,
  loadingOn,
} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {refreshCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {isInvalidPassword} from 'security/unlockFlow';
import {RESTORE_ERROR_CODES, restoreFromVault} from 'security/vaultRecovery';
import {store} from 'redux/store';
import {resolvePostUnlockRoute} from 'utils/postUnlockRoute';
import {setLastActiveTime} from 'utils/localStorageData';
import {showToast} from 'utils/toast';

const restoredMessage = ({wallets, skipped, via}) => {
  if (via === 'unlock') {
    return `Restored ${wallets} wallets.`;
  }
  return skipped
    ? `Restored ${wallets} wallets. ${skipped} had no keys to restore.`
    : `Restored ${wallets} wallets. Add any other coins you used from Manage coins.`;
};

// Onboarding found a vault without an account: the wallets' keys are still in
// this browser. The old password restores them (security/vaultRecovery).
const RestoreFromDeviceScreen = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const [password, setPassword] = useState('');
  const [hide, setHide] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const searchString = searchParams?.toString() ? `?${searchParams}` : '';

  const handleRestore = async e => {
    e?.preventDefault?.();
    if (!password || busy) {
      return;
    }
    setError(null);
    setBusy(true);
    dispatch(loadingOn());
    try {
      const counts = await dispatch(restoreFromVault(password));
      setLastActiveTime();
      showToast({
        type: 'successToast',
        title: 'Wallets restored',
        message: restoredMessage(counts),
      });
      // Read the store now: the wallets slice was empty until the restore.
      const {route, hasWallet} = resolvePostUnlockRoute(
        store.getState(),
        searchParams,
      );
      router.replace(route);
      if (hasWallet) {
        dispatch(refreshCoins());
      }
    } catch (err) {
      if (isInvalidPassword(err)) {
        setError('Wrong password. Use the password you had before.');
      } else if (
        err?.code === RESTORE_ERROR_CODES.NOTHING_TO_RESTORE ||
        err?.code === RESTORE_ERROR_CODES.TOO_MANY_ATTEMPTS ||
        err?.code === RESTORE_ERROR_CODES.FAILED
      ) {
        setError(err.message);
      } else {
        setError(
          'Your wallets could not be restored. Nothing was changed; please try again.',
        );
      }
    } finally {
      setBusy(false);
      dispatch(loadingOff());
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formTitle}>
        <h2 className={styles.title}>Restore wallets</h2>
        <p className={styles.text}>
          Your wallets are still saved in this browser. Enter the password you
          used before to restore them.
        </p>
      </div>
      <form className={styles.formInput} onSubmit={handleRestore}>
        <FormControl sx={{m: 1, width: '25ch'}} variant='outlined'>
          <InputLabel
            sx={{color: error ? 'red' : 'var(--borderActiveColor)'}}
            focused={false}>
            Previous password
          </InputLabel>
          <OutlinedInput
            autoFocus={true}
            id='password'
            type={!hide ? 'text' : 'password'}
            name='password'
            autoComplete='current-password'
            onChange={e => setPassword(e.target.value)}
            value={password}
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
            label='Previous password'
            sx={{
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: error ? 'red' : 'var(--sidebarIcon)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: error ? 'red' : 'var(--borderActiveColor)',
              },
              '&:hover fieldset': {
                borderColor: 'var(--sidebarIcon) !important',
              },
            }}
          />
        </FormControl>
        {error ? <p className={styles.textConfirm}>{error}</p> : null}
        <button className={styles.button} type='submit' disabled={busy}>
          {busy ? 'Restoring…' : 'Restore'}
        </button>
        <button
          type='button'
          className={localStyles.link}
          disabled={busy}
          onClick={() => router.push(`/auth/registration${searchString}`)}>
          Start over with a new account instead
        </button>
      </form>
    </div>
  );
};

export default RestoreFromDeviceScreen;
