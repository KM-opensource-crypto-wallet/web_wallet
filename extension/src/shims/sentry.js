// `@sentry/nextjs` for the extension: the browser SDK (via @sentry/react).
// The web build tunnels events through its own origin (/monitoring/); the
// extension has no server, so events go straight to Sentry and the tunnel
// option is dropped.
import * as SentryReact from '@sentry/react';

export * from '@sentry/react';

export const init = ({tunnel, ...options} = {}) =>
  SentryReact.init({
    ...options,
    initialScope: {
      ...(options.initialScope || {}),
      tags: {
        ...(options.initialScope?.tags || {}),
        platform: 'chrome-extension',
      },
    },
  });

export const captureRouterTransitionStart = () => {};
