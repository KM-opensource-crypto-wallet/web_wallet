// Shared Sentry.init options for the browser, Node and edge runtimes. Pure and
// isomorphic: no `window`, no chain configs (config/config.js would drag
// bitcoinjs/Stellar into the pre-hydration client bundle), no SDK calls.
//
// What never leaves the device: mnemonics, private keys, passwords, request
// bodies/headers. `scrub.js` enforces this in beforeSend / beforeBreadcrumb /
// beforeSendLog, and call sites must still not pass addresses or amounts.
import {scrubObject, scrubString} from './scrub';
import {ignoreErrors} from './ignoreErrors';

// Support wants `tx_hash` searchable; it is public chain data.
export const EVENT_ALLOW_KEYS = ['tx_hash'];
// Console breadcrumbs are context for an error, not the log stream; the full
// stream is in Logs. Dropping `log`/`debug` keeps the 50-entry ring useful.
const CONSOLE_BREADCRUMB_LEVELS = new Set([
  'info',
  'warning',
  'error',
  'fatal',
]);

export const isDev = () => process.env.ENV_MODE === 'DEV';

// Events leave the browser only from production builds, unless a developer
// opts in for a local end-to-end check.
export const isSentryEnabled = () =>
  Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) &&
  (process.env.NODE_ENV === 'production' ||
    process.env.SENTRY_ENABLE_IN_DEV === 'true');

export const environment = () => (isDev() ? 'development' : 'production');

// Same string as `release.name` in next.config.js so all three runtimes agree.
export const releaseName = () =>
  `${process.env.APP_NAME}@${process.env.APP_VERSION}`;

export const beforeSend = event => {
  if (event.message) {
    event.message = scrubString(event.message);
  }
  if (event.exception?.values) {
    event.exception.values.forEach(exception => {
      if (exception.value) {
        exception.value = scrubString(exception.value);
      }
    });
  }
  if (event.extra) {
    event.extra = scrubObject(event.extra, {allowKeys: EVENT_ALLOW_KEYS});
  }
  if (event.tags) {
    event.tags = scrubObject(event.tags, {allowKeys: EVENT_ALLOW_KEYS});
  }
  if (event.user) {
    event.user = event.user.id ? {id: event.user.id} : undefined;
  }
  // URL, headers, cookies: the host is already a tag and the rest is PII.
  delete event.request;
  return event;
};

export const beforeBreadcrumb = breadcrumb => {
  if (
    breadcrumb.category === 'console' &&
    !CONSOLE_BREADCRUMB_LEVELS.has(breadcrumb.level)
  ) {
    return null;
  }
  if (breadcrumb.message) {
    breadcrumb.message = scrubString(breadcrumb.message);
  }
  if (breadcrumb.data) {
    breadcrumb.data = scrubObject(breadcrumb.data, {
      allowKeys: EVENT_ALLOW_KEYS,
    });
  }
  return breadcrumb;
};

export const beforeSendLog = log => {
  if (log.message) {
    log.message = scrubString(log.message);
  }
  if (log.attributes) {
    log.attributes = scrubObject(log.attributes, {allowKeys: EVENT_ALLOW_KEYS});
  }
  return log;
};

export const baseOptions = () => ({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: isSentryEnabled(),
  // SDK internals (envelope sends, dropped events) in the console; dev only.
  debug: isDev() && process.env.SENTRY_DEBUG === 'true',
  environment: environment(),
  release: releaseName(),
  enableLogs: true,
  // Errors + logs + breadcrumbs only. No tracing, profiling or replay.
  tracesSampleRate: 0,
  maxBreadcrumbs: 50,
  sendDefaultPii: false,
  ignoreErrors,
  beforeSend,
  beforeBreadcrumb,
  beforeSendLog,
});
