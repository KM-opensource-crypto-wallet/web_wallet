'use client';

import {useEffect, Suspense} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import styles from './Error.module.css';

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl');

  const getRedirectPath = () => {
    if (!callbackUrl) return '/auth/login';
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
        return '/auth/login';
      }
    }
    return '/auth/login';
  };

  const redirectPath = getRedirectPath();

  useEffect(() => {
    if (!error) {
      // If no error, redirect to the callbackUrl or login
      router.replace(redirectPath);
    }
  }, [error, router, redirectPath]);

  if (!error) {
    return (
      <div className={styles.redirectContainer}>
        <p>Redirecting...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>⚠️</div>
        <h2 className={styles.title}>Sign-in Error</h2>
        <p className={styles.errorText}>
          {error === 'Callback'
            ? 'There was a problem signing in with Google. Please try again.'
            : error || 'An error occurred during sign-in.'}
        </p>
        <button
          className={styles.button}
          onClick={() => router.push(redirectPath)}>
          Go Back
        </button>
      </div>
    </div>
  );
}

export default function CustomSignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
