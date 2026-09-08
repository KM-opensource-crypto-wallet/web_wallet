import {DokApi} from 'dok-wallet-blockchain-networks/config/dokApi';

const CAPTCHA_ACTION = 'web_wallet';
const BOOTSTRAP_URL = '/get-white-label';
// A blocked browser fails every call; one line a minute is enough to diagnose.
const LOG_THROTTLE_MS = 60_000;
const REASON_MAX_CHARS = 500;
// Script tag id used by react-google-recaptcha-v3.
const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-v3';
const TAG_NO_TOKEN = '[captcha] failed to obtain token';
const TAG_REJECTED = '[captcha] request rejected';

export const captchaRef = {execute: null};
let _appName = null;
let _interceptorId = null;
let _responseInterceptorId = null;
// Per-tag timestamps so a missing-token warning can't starve the 403 one.
const _lastLogAt = new Map();

export const resetCaptchaLogThrottle = () => {
  _lastLogAt.clear();
};

const shouldLog = tag => {
  const now = Date.now();
  if (now - (_lastLogAt.get(tag) || 0) < LOG_THROTTLE_MS) return false;
  _lastLogAt.set(tag, now);
  return true;
};

const truncate = (value, max) => {
  let str;
  try {
    str = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    str = String(value);
  }
  if (!str) return str;
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
};

// Environment facts that explain a "browser-error" from Google: whether the
// reCAPTCHA script tag exists, whether it actually initialised, and what
// browser this is. Safe to call server-side or in node tests.
const describeEnvironment = () => {
  const hasWindow = typeof window !== 'undefined';
  const hasDocument = typeof document !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';
  return {
    grecaptchaLoaded:
      hasWindow && typeof window.grecaptcha?.execute === 'function',
    scriptTagPresent:
      hasDocument && !!document.getElementById?.(RECAPTCHA_SCRIPT_ID),
    userAgent: hasNavigator ? navigator.userAgent : undefined,
    isBrave: hasNavigator && typeof navigator.brave?.isBrave === 'function',
  };
};

// Builds the diagnostic payload for a rejected request. Never includes the
// full token: only its length and a short prefix, which is enough to tell a
// real Google token (~1500+ chars, "0cAF…") from a degraded one.
export const describeCaptchaFailure = error => {
  const token = error?.config?.headers?.['x-captcha-token'];
  const tokenStr = typeof token === 'string' ? token : '';
  return {
    ts: new Date().toISOString(),
    url: error?.config?.url,
    status: error?.response?.status,
    reason: truncate(error?.response?.data, REASON_MAX_CHARS),
    tokenSent: tokenStr.length > 0,
    tokenLength: tokenStr.length,
    tokenPrefix: tokenStr.slice(0, 6),
    ...describeEnvironment(),
  };
};

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
  if (_responseInterceptorId !== null) {
    DokApi.interceptors.response.eject(_responseInterceptorId);
  }

  _interceptorId = DokApi.interceptors.request.use(
    async requestConfig => {
      if (typeof window === 'undefined') return requestConfig;

      // Bootstrap call — white-label data isn't available yet, skip attestation
      if (requestConfig.url === BOOTSTRAP_URL) return requestConfig;

      if (_appName) {
        requestConfig.headers['x-app-name'] = `${_appName}-web`;
      }

      try {
        const executor = await waitForExecutor();
        requestConfig.headers['x-captcha-token'] =
          await executor(CAPTCHA_ACTION);
      } catch (err) {
        if (shouldLog(TAG_NO_TOKEN)) {
          console.warn(
            TAG_NO_TOKEN,
            JSON.stringify({
              ts: new Date().toISOString(),
              url: requestConfig.url,
              error: err?.message,
              ...describeEnvironment(),
            }),
          );
        }
      }

      return requestConfig;
    },
    err => Promise.reject(err),
  );

  // Failure-only diagnostics. The worker answers 403 when Google rejects the
  // token (e.g. "browser-error" from an ad blocker or privacy shield). Axios's
  // toJSON drops error.response, so without this Bugfender never sees why.
  _responseInterceptorId = DokApi.interceptors.response.use(
    response => response,
    error => {
      const status = error?.response?.status;
      const url = error?.config?.url;
      if (status === 403 && url !== BOOTSTRAP_URL && shouldLog(TAG_REJECTED)) {
        console.warn(
          TAG_REJECTED,
          JSON.stringify(describeCaptchaFailure(error)),
        );
      }
      return Promise.reject(error);
    },
  );
};
