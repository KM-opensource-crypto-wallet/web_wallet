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
// Hosts that belong to the page itself or to reCAPTCHA; anything else loading
// a <script> is third-party (analytics, injected security software, ...).
const KNOWN_SCRIPT_HOSTS = [
  'www.google.com',
  'www.gstatic.com',
  'www.recaptcha.net',
  'www.googletagmanager.com',
  'www.google-analytics.com',
];

export const captchaRef = {execute: null};
let _appName = null;
let _interceptorId = null;
let _responseInterceptorId = null;
// Per-tag timestamps so a missing-token warning can't starve the 403 one.
const _lastLogAt = new Map();

// Session counters. They tell "every call fails" apart from "calls fail only
// in bursts", and show how many grecaptcha.execute() calls were in flight at
// once — the demo page that works for the same user runs exactly one.
const _stats = {
  executes: 0,
  inFlight: 0,
  maxInFlight: 0,
  ok: 0,
  rejected: 0,
};

export const resetCaptchaLogThrottle = () => {
  _lastLogAt.clear();
};

export const resetCaptchaStats = () => {
  _stats.executes = 0;
  _stats.inFlight = 0;
  _stats.maxInFlight = 0;
  _stats.ok = 0;
  _stats.rejected = 0;
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

const hostOf = url => {
  try {
    return new URL(url, location.href).hostname;
  } catch {
    return null;
  }
};

// What the reCAPTCHA client actually managed to set up on this page: the
// hidden anchor iframe and badge (its second stage after api.js), the release
// hash of the client script (a stale/odd release explains odd tokens), and
// the hosts its resources came from.
const describeRecaptchaClient = () => {
  if (typeof document === 'undefined') return {};
  const out = {};
  try {
    out.anchorIframe = !!document.querySelector(
      'iframe[src*="recaptcha/api2/anchor"], iframe[src*="recaptcha/enterprise/anchor"]',
    );
    out.badge = !!document.querySelector('.grecaptcha-badge');
    const releaseScript = document.querySelector(
      'script[src*="/recaptcha/releases/"]',
    );
    out.release =
      releaseScript?.src?.match(/\/releases\/([^/]+)\//)?.[1] || null;
  } catch {
    // DOM access can throw in odd embedding contexts; the field is optional.
  }
  try {
    const entries =
      typeof performance?.getEntriesByType === 'function'
        ? performance.getEntriesByType('resource')
        : [];
    const hosts = new Set();
    for (const e of entries) {
      if (/recaptcha/i.test(e.name)) {
        const h = hostOf(e.name);
        if (h) hosts.add(h);
      }
    }
    out.resourceHosts = [...hosts];
  } catch {
    // Performance API missing or restricted; field is optional.
  }
  return out;
};

// Hostnames (only) of scripts that are neither ours nor reCAPTCHA's. Security
// suites and some extensions inject scripts into every page, and those break
// reCAPTCHA's checks — this is how we'd see them without access to the machine.
const thirdPartyScriptHosts = () => {
  if (typeof document === 'undefined') return [];
  try {
    const own = location.hostname;
    const hosts = new Set();
    for (const el of document.querySelectorAll('script[src]')) {
      const h = hostOf(el.src);
      if (h && h !== own && !KNOWN_SCRIPT_HOSTS.includes(h)) hosts.add(h);
    }
    return [...hosts];
  } catch {
    return [];
  }
};

// Environment facts that explain a "browser-error" from Google. Safe to call
// server-side or in node tests: every browser global is guarded.
const describeEnvironment = () => {
  const hasWindow = typeof window !== 'undefined';
  const hasDocument = typeof document !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';
  const env = {
    grecaptchaLoaded:
      hasWindow && typeof window.grecaptcha?.execute === 'function',
    scriptTagPresent:
      hasDocument && !!document.getElementById?.(RECAPTCHA_SCRIPT_ID),
    userAgent: hasNavigator ? navigator.userAgent : undefined,
    isBrave: hasNavigator && typeof navigator.brave?.isBrave === 'function',
  };
  if (hasWindow && typeof location !== 'undefined') {
    // Host + path only; the query string can carry referral ids etc.
    env.page = `${location.host}${location.pathname}`;
  }
  if (hasWindow) {
    env.sinceLoadMs =
      typeof performance?.now === 'function'
        ? Math.round(performance.now())
        : undefined;
  }
  if (hasDocument) {
    // reCAPTCHA's timers are throttled in background tabs.
    env.visibility = document.visibilityState;
    env.hasFocus =
      typeof document.hasFocus === 'function' ? document.hasFocus() : undefined;
  }
  if (hasNavigator) {
    // webdriver=true means an automation tool is driving this browser.
    env.webdriver = navigator.webdriver === true;
    env.cookieEnabled = navigator.cookieEnabled;
    env.language = navigator.language;
  }
  env.recaptcha = describeRecaptchaClient();
  env.thirdPartyScripts = thirdPartyScriptHosts();
  env.stats = {..._stats};
  return env;
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

const runExecutor = async executor => {
  _stats.executes += 1;
  _stats.inFlight += 1;
  _stats.maxInFlight = Math.max(_stats.maxInFlight, _stats.inFlight);
  try {
    return await executor(CAPTCHA_ACTION);
  } finally {
    _stats.inFlight -= 1;
  }
};

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
        requestConfig.headers['x-captcha-token'] = await runExecutor(executor);
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
  // token (e.g. "browser-error"). Axios's toJSON drops error.response, so
  // without this Sentry never sees why. Successes are only counted.
  _responseInterceptorId = DokApi.interceptors.response.use(
    response => {
      if (response?.config?.headers?.['x-captcha-token']) {
        _stats.ok += 1;
      }
      return response;
    },
    error => {
      const status = error?.response?.status;
      const url = error?.config?.url;
      if (status === 403 && url !== BOOTSTRAP_URL) {
        _stats.rejected += 1;
        if (shouldLog(TAG_REJECTED)) {
          console.warn(
            TAG_REJECTED,
            JSON.stringify(describeCaptchaFailure(error)),
          );
        }
      }
      return Promise.reject(error);
    },
  );
};
