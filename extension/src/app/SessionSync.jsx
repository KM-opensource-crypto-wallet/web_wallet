// Keeps the unlock session (src/extension/session.js) in step with the app:
//   - mirrors the auto-lock setting for the service worker;
//   - starts keeping the DEK if auto-lock is switched on while unlocked;
//   - locks this page when another extension page locked.
import {useEffect} from 'react';
import {useDispatch, useSelector, useStore} from 'react-redux';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {getLockTime} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {getIsVaultUnlocked} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {lockSession, rememberSession} from 'security/unlockFlow';
import {authRoutes} from 'utils/routes';
import {history} from '@ext/router/history';
import {onLockBroadcast} from '@ext/extension/session';

export default function SessionSync() {
  const dispatch = useDispatch();
  const store = useStore();
  const lockTime = useSelector(getLockTime);
  const isVaultUnlocked = useSelector(getIsVaultUnlocked);

  useEffect(() => {
    if (isVaultUnlocked && vault.isUnlocked()) {
      rememberSession(store.getState);
    }
  }, [lockTime, isVaultUnlocked, store]);

  useEffect(
    () =>
      onLockBroadcast(() => {
        if (!vault.isUnlocked()) {
          return;
        }
        dispatch(lockSession());
        history.replace(authRoutes.login);
      }),
    [dispatch],
  );

  return null;
}
