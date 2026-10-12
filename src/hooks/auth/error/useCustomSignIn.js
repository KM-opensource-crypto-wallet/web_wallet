import {useEffect} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';

const FALLBACK_PATH = '/auth/login';

// Where "Go back" (or the automatic redirect) leads: `callbackUrl` when it
// stays on this app, the login page otherwise.
const getRedirectPath = callbackUrl => {
  if (!callbackUrl) {
    return FALLBACK_PATH;
  }
  // Allow local paths only — reject protocol-relative ('//') and other schemes
  if (callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
    return callbackUrl;
  }
  if (callbackUrl.startsWith('http')) {
    try {
      const url = new URL(callbackUrl);
      const appOrigin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || '';
      if (url.origin === appOrigin) {
        return url.pathname + url.search;
      }
    } catch {
      return FALLBACK_PATH;
    }
  }
  return FALLBACK_PATH;
};

const getErrorMessage = error =>
  error === 'Callback'
    ? 'There was a problem signing in with Google. Please try again.'
    : error || 'An error occurred during sign-in.';

// The sign-in error page: shows `?error=`, or redirects straight away when
// there is none.
export const useCustomSignIn = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  const redirectPath = getRedirectPath(searchParams.get('callbackUrl'));

  useEffect(() => {
    if (!error) {
      router.replace(redirectPath);
    }
  }, [error, router, redirectPath]);

  const goBack = () => router.push(redirectPath);

  return {
    hasError: !!error,
    message: getErrorMessage(error),
    goBack,
  };
};

export default useCustomSignIn;
