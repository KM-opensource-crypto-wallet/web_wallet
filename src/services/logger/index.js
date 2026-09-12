// Error reporting and logs (Sentry). This is the only module the rest of the
// app should import for observability; call sites never touch `@sentry/*`.
// The shared submodule (dok-wallet-blockchain-networks) imports this same
// path, so the API must stay identical to the mobile app's services/logger.
//
// What is captured:
//   - uncaught errors + unhandled rejections (SDK default handlers), plus the
//     App Router error boundaries (app/error.jsx, app/global-error.jsx)
//   - every console.* call as a Sentry Log (Console Logging integration; this
//     is the Bugfender behaviour the team relies on)
//   - structured `logger.*` calls, `captureError`, `addBreadcrumb` from a small
//     number of chokepoints (send, wallet create/import, WalletConnect, DokApi,
//     rejected thunks, toasts, navigation)
//
// Every event and log carries the whitelabel (`whitelabel`, `white_label_id`,
// `host`) via setWhiteLabelContext: all whitelabels share one Sentry project.
//
// What never leaves the device: mnemonics, private keys, passwords, request
// bodies/headers. `sentryOptions.js` enforces this in the SDK hooks, and call
// sites must still not pass addresses or amounts.
//
// This module is evaluated during SSR of client components too, so it keeps
// no module-level state: Sentry's isolation scope is per request on the
// server and global in the browser, which is exactly the lifetime we want.
import * as Sentry from '@sentry/nextjs';
import {scrubString, stripQuery} from './scrub';
import {isDev} from './sentryOptions';

export {isSentryEnabled} from './sentryOptions';

const safeStringify = value => {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
};

// Prints to the devtools/server console without being re-captured as a log.
// Sentry's console instrumentation keeps the original method on
// `__sentry_original__` (the same trick the SDK's own consoleSandbox uses;
// @sentry/nextjs does not export it).
const devPrint = (method, ...args) => {
  if (!isDev()) {
    return;
  }
  const target = console[method] || console.log;
  (target.__sentry_original__ || target)(...args);
};

// Sentry log attributes must be primitives; flatten objects to scrubbed JSON.
const compact = attrs => {
  if (!attrs || typeof attrs !== 'object') {
    return undefined;
  }
  const out = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) {
      continue;
    }
    out[key] =
      typeof value === 'object' ? scrubString(safeStringify(value)) : value;
  }
  return out;
};

const emitLog = level => (message, attrs) => {
  const attributes = compact(attrs);
  devPrint(
    level === 'warn' || level === 'error' ? level : 'log',
    `[${level}] ${message}`,
    attributes || '',
  );
  try {
    Sentry.logger[level](message, attributes);
  } catch (e) {
    // Never let observability break the app.
  }
};

export const logger = {
  debug: emitLog('debug'),
  info: emitLog('info'),
  warn: emitLog('warn'),
  error: emitLog('error'),
};

const toError = value => {
  if (value instanceof Error) {
    return value;
  }
  return new Error(typeof value === 'string' ? value : safeStringify(value));
};

// `tags` are indexed/searchable (short strings); `extra` is free-form context.
export const captureError = (error, {tags, extra, level} = {}) => {
  const err = toError(error);
  devPrint('error', '[captureError]', err, tags || '', extra || '');
  try {
    Sentry.captureException(err, {tags, extra, level});
  } catch (e) {
    // Never let observability break the app.
  }
};

export const addBreadcrumb = (category, message, data, level = 'info') => {
  try {
    Sentry.addBreadcrumb({category, message, data, level});
  } catch (e) {
    // Never let observability break the app.
  }
};

// The wallet's persisted masterClientId: stable per browser profile, not tied
// to any address. Support can look up a user's events once they share it.
export const setUserContext = masterClientId => {
  try {
    // Reaches both events and logs as `user.id`.
    Sentry.setUser(masterClientId ? {id: String(masterClientId)} : null);
  } catch (e) {
    // Never let observability break the app.
  }
};

// Whitelabel identity for the current scope. In the browser this is the whole
// session; on the server it is the current request (call it once per request
// from the layout / route handler). Tags reach events, attributes reach logs.
export const setWhiteLabelContext = ({name, id, host} = {}) => {
  const context = compact({
    whitelabel: typeof name === 'string' ? name.toLowerCase() : undefined,
    white_label_id: id,
    host,
  });
  if (!context || Object.keys(context).length === 0) {
    return;
  }
  try {
    Sentry.setTags(context);
    Sentry.setAttributes(context);
  } catch (e) {
    // Never let observability break the app.
  }
};

// One structured log per failed backend call: method, path, status. No body,
// no headers, no query string.
export const attachDokApiLogging = axiosInstance => {
  return axiosInstance.interceptors.response.use(
    response => response,
    error => {
      const config = error?.config || {};
      const response = error?.response;
      logger.warn('dokapi.failed', {
        method: config.method ? String(config.method).toUpperCase() : undefined,
        path: stripQuery(config.url),
        status: response?.status,
        code: error?.code,
        backend_code: response?.data?.code,
        backend_message:
          typeof response?.data?.message === 'string'
            ? response.data.message.slice(0, 200)
            : undefined,
      });
      return Promise.reject(error);
    },
  );
};
