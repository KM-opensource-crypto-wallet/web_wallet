import {useCallback, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {
  handleAttempts,
  loadingOff,
  logInSuccess,
  resetAttempts,
  setLastAttempt,
} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {getLastAttempt} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {refreshCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {isWalletReset} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  UNLOCK_ERROR_CODES,
  isInvalidPassword,
  unlockWithPassword,
} from 'security/unlockFlow';
import {captureError} from 'services/logger';
import {store} from 'redux/store';
import {resolvePostUnlockRoute} from 'utils/postUnlockRoute';
import {validationSchemaLogin} from 'utils/validationSchema';
import {setLastActiveTime} from 'utils/localStorageData';
import {skipLockOnNextLoad} from 'utils/lockScreen';

const INITIAL_VALUES = {password: ''};

// Long enough for the replayed navigation to settle (or hard-reload), short
// enough that a later manual reload still locks.
const REPLAY_SKIP_LOCK_TTL_MS = 10000;

export const useLogin = () => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [wrong, setWrong] = useState(false);
  // A problem that must not be dismissed as "wrong password": wallets without
  // keys in the vault, or secure storage unavailable.
  const [blocked, setBlocked] = useState(null);
  const router = useRouter();
  const dispatch = useDispatch();
  const rateLimitCheck = useSelector(isWalletReset);
  const lastAttempt = useSelector(getLastAttempt);
  const searchParams = useSearchParams();

  const openResetModal = useCallback(() => setShowResetModal(true), []);
  const closeResetModal = useCallback(() => setShowResetModal(false), []);
  const clearWrong = useCallback(() => setWrong(false), []);
  const closeLastAttempt = useCallback(
    () => dispatch(setLastAttempt(false)),
    [dispatch],
  );

  const handleSubmit = useCallback(
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

  return {
    initialValues: INITIAL_VALUES,
    validationSchema: validationSchemaLogin,
    handleSubmit,
    wrong,
    clearWrong,
    blocked,
    showResetModal,
    openResetModal,
    closeResetModal,
    lastAttempt,
    closeLastAttempt,
  };
};

export default useLogin;
