'use client';

import {useCallback} from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const CAPTCHA_ACTION = 'web_wallet';

export const useCaptcha = () => {
  const executeRecaptcha = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.grecaptcha) {
          reject(new Error('reCAPTCHA not loaded'));
          return;
        }
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute(SITE_KEY, {action: CAPTCHA_ACTION})
            .then(resolve)
            .catch(reject);
        });
      }),
    [],
  );

  return {executeRecaptcha};
};
