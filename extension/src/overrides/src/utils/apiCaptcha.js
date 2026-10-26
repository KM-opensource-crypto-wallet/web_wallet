// Extension `utils/apiCaptcha`.
//
// The web build attaches a reCAPTCHA v3 token to every DokApi request.
// reCAPTCHA cannot run in an extension page (remote script, domain-bound site
// key), so the extension asks a page on the web wallet's domain for tokens:
// web_wallet/src/app/ext-captcha/route.js, loaded in a hidden iframe and
// spoken to over postMessage. Its tokens are issued for that domain, so the
// backend verifies them like web tokens.
//
// Headers sent:
//   x-app-name: <brand>-<EXT_APP_NAME_SUFFIX>   (default: <brand>-web)
//   x-captcha-token: <token>   only when CAPTCHA_BRIDGE_URL is configured
//
// When the bridge is not configured, or fails to load, requests go out
// without a token, as before.
import {DokApi} from 'dok-wallet-blockchain-networks/config/dokApi';

export * from '@web-original/src/utils/apiCaptcha';

const BOOTSTRAP_URL = '/get-white-label';
const SUFFIX = process.env.EXT_APP_NAME_SUFFIX || 'web';
const BRIDGE_URL = process.env.EXT_CAPTCHA_BRIDGE_URL;
// Must match the web build (utils/apiCaptcha.js).
const CAPTCHA_ACTION = 'web_wallet';
const READY_TIMEOUT_MS = 10_000;
const TOKEN_TIMEOUT_MS = 10_000;
// After the bridge fails to load, send requests without a token for this
// long instead of making each one wait for another attempt.
const RETRY_AFTER_MS = 60_000;
const LOG_THROTTLE_MS = 60_000;

let interceptorId = null;
let bridge = null;
let bridgeFailedAt = 0;
let requestSeq = 0;
let lastLogAt = 0;
const pending = new Map();

const logFailure = (url, err) => {
  if (Date.now() - lastLogAt < LOG_THROTTLE_MS) {
    return;
  }
  lastLogAt = Date.now();
  console.warn(
    '[captcha] failed to obtain token',
    JSON.stringify({url, error: err?.message, bridge: BRIDGE_URL}),
  );
};

const teardownBridge = () => {
  if (!bridge) {
    return;
  }
  window.removeEventListener('message', bridge.onMessage);
  bridge.frame.remove();
  bridge = null;
  pending.forEach(request => {
    clearTimeout(request.timer);
    request.reject(new Error('captcha bridge closed'));
  });
  pending.clear();
};

// Adds the hidden iframe once and resolves when the page says it is ready.
const ensureBridge = () => {
  if (bridge) {
    return bridge.ready;
  }
  const origin = new URL(BRIDGE_URL).origin;
  const frame = document.createElement('iframe');
  frame.src = BRIDGE_URL;
  frame.title = 'reCAPTCHA';
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  // Not display:none: reCAPTCHA scores a rendered frame more reliably.
  frame.style.cssText =
    'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;';

  let markReady;
  const ready = new Promise((resolve, reject) => {
    markReady = resolve;
    setTimeout(
      () => reject(new Error('captcha bridge did not load')),
      READY_TIMEOUT_MS,
    );
  });

  const onMessage = event => {
    if (event.origin !== origin || event.source !== frame.contentWindow) {
      return;
    }
    const data = event.data || {};
    if (data.type === 'captcha:ready') {
      markReady();
      return;
    }
    if (data.type !== 'captcha:result') {
      return;
    }
    const request = pending.get(data.id);
    if (!request) {
      return;
    }
    pending.delete(data.id);
    clearTimeout(request.timer);
    if (data.token) {
      request.resolve(data.token);
    } else {
      request.reject(new Error(data.error || 'no token'));
    }
  };

  window.addEventListener('message', onMessage);
  bridge = {frame, origin, ready, onMessage};
  ready.catch(() => {
    bridgeFailedAt = Date.now();
    teardownBridge();
  });
  (document.body || document.documentElement).appendChild(frame);
  return ready;
};

const getToken = async () => {
  if (Date.now() - bridgeFailedAt < RETRY_AFTER_MS) {
    throw new Error('captcha bridge unavailable');
  }
  await ensureBridge();
  const {frame, origin} = bridge;
  requestSeq += 1;
  const id = String(requestSeq);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('captcha token timed out'));
    }, TOKEN_TIMEOUT_MS);
    pending.set(id, {resolve, reject, timer});
    frame.contentWindow.postMessage(
      {type: 'captcha:execute', id, action: CAPTCHA_ACTION},
      origin,
    );
  });
};

// Root.jsx calls this as soon as the white-label data is known, before the
// first app request; setWhiteLabelInfo calls it again with the same name.
export const setupWebCaptchaInterceptor = appName => {
  if (interceptorId !== null) {
    DokApi.interceptors.request.eject(interceptorId);
  }
  interceptorId = DokApi.interceptors.request.use(async requestConfig => {
    if (requestConfig.url === BOOTSTRAP_URL) {
      return requestConfig;
    }
    if (appName) {
      requestConfig.headers['x-app-name'] = `${appName}-${SUFFIX}`;
    }
    if (BRIDGE_URL) {
      try {
        requestConfig.headers['x-captcha-token'] = await getToken();
      } catch (err) {
        logFailure(requestConfig.url, err);
      }
    }
    return requestConfig;
  });
};
