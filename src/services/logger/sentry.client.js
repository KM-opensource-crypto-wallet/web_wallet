// Browser Sentry init. Imported by src/instrumentation-client.js, which Next
// runs before hydration, so startup failures are covered too.
import * as Sentry from '@sentry/nextjs';
import {baseOptions} from './sentryOptions';
import {CONSOLE_LOG_LEVELS} from './consoleLevels';
import {
  describeClientDevice,
  deviceAttributes,
  refineClientDevice,
} from './clientDevice';

const host =
  typeof window !== 'undefined' ? window.location?.hostname : undefined;

// Tracing is off (tracesSampleRate 0), so the tracing integrations the Next
// SDK adds by default would only create spans to discard them.
const TRACING_INTEGRATIONS = new Set(['BrowserTracing', 'WebVitals']);

Sentry.init({
  ...baseOptions(),
  integrations: defaults => [
    ...defaults.filter(
      integration => !TRACING_INTEGRATIONS.has(integration.name),
    ),
    // Chain SDKs fire hundreds of RPC calls per screen and RPC URLs can carry
    // provider keys; the DokApi interceptor is the one HTTP signal we want.
    Sentry.breadcrumbsIntegration({xhr: false, fetch: false}),
    Sentry.consoleLoggingIntegration({levels: CONSOLE_LOG_LEVELS}),
  ],
  // The whitelabel name/id arrive with wlData (AppRouting); the domain is
  // known now, so no event is ever untagged.
  initialScope: {tags: host ? {host} : {}},
});

if (host) {
  Sentry.setAttributes({host});
}

// Browser and OS on every log (attributes) and error (the standard contexts
// the issue UI renders as pills). Detected here rather than inferred by Sentry
// from the User-Agent, which would require IP collection too.
const applyDevice = device => {
  try {
    Sentry.setAttributes(deviceAttributes(device));
    Sentry.setContext('browser', device.browser);
    Sentry.setContext('os', device.os);
  } catch (e) {
    // Never let observability break the app.
  }
};

if (typeof navigator !== 'undefined') {
  applyDevice(describeClientDevice(navigator));
  // Client Hints refine the versions asynchronously (Windows 11, full builds).
  refineClientDevice(navigator).then(refined => {
    if (refined) {
      applyDevice(refined);
    }
  });
}
