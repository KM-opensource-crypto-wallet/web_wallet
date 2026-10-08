// `next-auth/react` for the extension, on top of chrome.identity (see
// src/extension/googleAuth.js). Same surface the backup/restore pages use:
// useSession, signIn('google'), signOut, SessionProvider.
import React, {useEffect, useState} from 'react';
import {
  onGoogleSessionChange,
  readGoogleSession,
  signInWithGoogle,
  signOutOfGoogle,
} from '@ext/extension/googleAuth';
import {showToast} from 'utils/toast';

const toNextAuthSession = session =>
  session
    ? {
        user: session.user,
        accessToken: session.accessToken,
        expires: new Date(session.expiresAt).toISOString(),
      }
    : null;

export const SessionProvider = ({children}) => <>{children}</>;

export const useSession = () => {
  const [state, setState] = useState({data: null, status: 'loading'});
  useEffect(() => {
    let active = true;
    const apply = session => {
      if (active) {
        setState({
          data: toNextAuthSession(session),
          status: session ? 'authenticated' : 'unauthenticated',
        });
      }
    };
    readGoogleSession().then(apply, () => apply(null));
    const unsubscribe = onGoogleSessionChange(apply);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return {
    ...state,
    update: async () => toNextAuthSession(await readGoogleSession()),
  };
};

export const getSession = async () =>
  toNextAuthSession(await readGoogleSession());

// The pages call signIn('google', {redirect: false}) and follow `result.url`
// if one comes back. The flow completes in place here, so there is none.
export const signIn = async () => {
  try {
    await signInWithGoogle({interactive: true});
    return {ok: true, error: null, status: 200, url: null};
  } catch (error) {
    // A closed consent window is not an error worth a toast.
    if (!/did not approve|canceled|cancelled/i.test(error?.message || '')) {
      showToast({
        type: 'errorToast',
        title: 'Google sign-in',
        message: error.message,
      });
    }
    return {ok: false, error: error?.message, status: 401, url: null};
  }
};

export const signOut = async () => {
  await signOutOfGoogle();
  return {url: null};
};
