import {DokApi} from 'dok-wallet-blockchain-networks/config/dokApi';

const CAPTCHA_ACTION = 'web_wallet';

export const captchaRef = {execute: null};
let _appName = null;
let _interceptorId = null;

const waitForExecutor = (timeout = 5000) =>
  new Promise((resolve, reject) => {
    if (captchaRef.execute) return resolve(captchaRef.execute);
    const deadline = Date.now() + timeout;
    const id = setInterval(() => {
      if (captchaRef.execute) {
        clearInterval(id);
        resolve(captchaRef.execute);
      } else if (Date.now() >= deadline) {
        clearInterval(id);
        reject(new Error('captcha executor not ready'));
      }
    }, 50);
  });

// Call once from setWhiteLabelInfo after white-label data is loaded.
// Not part of the submodule — mobile never calls this, so mobile requests are unaffected.
export const setupWebCaptchaInterceptor = appName => {
  if (appName) {
    _appName = appName;
  }

  if (_interceptorId !== null) {
    DokApi.interceptors.request.eject(_interceptorId);
  }

  _interceptorId = DokApi.interceptors.request.use(
    async requestConfig => {
      if (typeof window === 'undefined') return requestConfig;

      // Bootstrap call — white-label data isn't available yet, skip attestation
      if (requestConfig.url === '/get-white-label') return requestConfig;

      if (_appName) {
        requestConfig.headers['x-app-name'] = `${_appName}-web`;
      }

      try {
        const executor = await waitForExecutor();
        requestConfig.headers['x-captcha-token'] =
          await executor(CAPTCHA_ACTION);
      } catch (err) {
        console.warn('[captcha] Failed to obtain token:', err.message);
      }

      return requestConfig;
    },
    err => Promise.reject(err),
  );
};
