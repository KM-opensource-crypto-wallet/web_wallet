'use client';

import React, {Suspense} from 'react';
import useCustomSignIn from 'src/hooks/auth/error/useCustomSignIn';
import AuthLayout, {NonCustodialNote, authStyles} from 'components/AuthLayout';
import GeneralButton from 'src/components/Button';
import styles from './Error.module.css';

const Redirecting = () => (
  <AuthLayout title='Redirecting…'>
    <div className={styles.redirect}>
      <span className={styles.spinner} aria-hidden='true' />
    </div>
  </AuthLayout>
);

const ErrorIcon = () => (
  <svg
    width='26'
    height='26'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'>
    <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
    <path d='M12 9v4' />
    <path d='M12 17h.01' />
  </svg>
);

function SignInContent() {
  const {hasError, message, goBack} = useCustomSignIn();

  if (!hasError) {
    return <Redirecting />;
  }

  return (
    <AuthLayout
      title='Sign-in error'
      subtitle="We couldn't sign you in. Your wallet and keys are unaffected.">
      <div className={authStyles.form}>
        <div className={`${authStyles.card} ${styles.errorCard}`} role='alert'>
          <span className={styles.iconBadge}>
            <ErrorIcon />
          </span>
          <p className={styles.message}>{message}</p>
        </div>

        <div className={authStyles.footer}>
          <GeneralButton fullWidth onClick={goBack}>
            Go back
          </GeneralButton>
          <NonCustodialNote />
        </div>
      </div>
    </AuthLayout>
  );
}

export default function CustomSignIn() {
  return (
    <Suspense fallback={<Redirecting />}>
      <SignInContent />
    </Suspense>
  );
}
