'use client';
import {useEffect} from 'react';
import {captureError} from 'services/logger';

// Catches errors thrown by the root layout itself. It replaces the whole
// document, so it must render its own <html> and <body>.
export default function GlobalError({error, reset}) {
  useEffect(() => {
    captureError(error, {
      level: 'fatal',
      tags: {boundary: 'global'},
      extra: {digest: error?.digest},
    });
  }, [error]);

  return (
    <html lang='en'>
      <body
        style={{fontFamily: 'sans-serif', padding: 24, textAlign: 'center'}}>
        <h3>Something went wrong</h3>
        <button type='button' onClick={() => reset()}>
          Reload
        </button>
      </body>
    </html>
  );
}
