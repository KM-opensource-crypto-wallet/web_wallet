'use client';
// Extension login: unlock from the session first, password form otherwise.
//
// AppRouting sends every fresh page load to /auth/login (on the web the
// vault key never survives a load). In the extension a page opens every time
// the side panel does, so when the session still holds the DEK
// (src/extension/session.js) this unlocks straight away and continues
// exactly like a password login would. Anything else renders the web login.
import React, {useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';
import {useRouter, useSearchParams} from 'next/navigation';
import WebLoginScreen from '@web-original/src/app/auth/login/page';
import Loading from 'components/Loading';
import {unlockWithSession} from 'security/unlockFlow';
import {store} from 'redux/store';
import {resolvePostUnlockRoute} from 'utils/postUnlockRoute';
import {setLastActiveTime} from 'utils/localStorageData';
import {logInSuccess} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {refreshCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {captureError} from 'services/logger';
import {hasUsableSession} from '@ext/extension/session';

export default function LoginScreen() {
  const [mode, setMode] = useState('checking');
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;
    (async () => {
      let unlocked = false;
      try {
        if (await hasUsableSession()) {
          await dispatch(unlockWithSession());
          unlocked = true;
        }
      } catch (error) {
        captureError(error, {
          level: 'warning',
          tags: {area: 'auth', op: 'unlock_session'},
        });
      }
      if (!active) {
        return;
      }
      if (!unlocked) {
        setMode('password');
        return;
      }
      // Same continuation as the web login's success path.
      dispatch(logInSuccess());
      setLastActiveTime();
      const {route, hasWallet} = resolvePostUnlockRoute(
        store.getState(),
        searchParams,
      );
      router.replace(route);
      if (hasWallet) {
        dispatch(refreshCoins());
      }
    })();
    return () => {
      active = false;
    };
    // Once per mount: the session is checked when the login page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mode === 'password') {
    return <WebLoginScreen />;
  }
  return <Loading />;
}
