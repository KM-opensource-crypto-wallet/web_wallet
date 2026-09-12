// Node runtime Sentry init (server components, route handlers). Imported by
// src/instrumentation.js. Whitelabel tags are set per request from
// app/layout.js and route handlers (setWhiteLabelContext) and from
// onRequestError, because the isolation scope here is per request.
import * as Sentry from '@sentry/nextjs';
import {baseOptions} from './sentryOptions';
import {CONSOLE_LOG_LEVELS} from './consoleLevels';

Sentry.init({
  ...baseOptions(),
  integrations: [
    Sentry.consoleLoggingIntegration({levels: CONSOLE_LOG_LEVELS}),
  ],
});
