'use client';
import {useEffect} from 'react';
import {captureError} from 'services/logger';

// App Router boundary for render errors below the root layout. Next swallows
// these, so they never reach Sentry's global handler without this report.
export default function Error({error, reset}) {
  useEffect(() => {
    captureError(error, {
      tags: {boundary: 'app'},
      extra: {digest: error?.digest},
    });
  }, [error]);

  return (
    <div style={{padding: 24, textAlign: 'center'}}>
      <h3>Something went wrong</h3>
      <button type='button' onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
