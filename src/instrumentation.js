import * as Sentry from '@sentry/nextjs';
import {
  getWhiteLabelForHost,
  hostFromHeaderValue,
} from './whitelabel/serverWhiteLabel';
import {isMalformedRequestError} from './services/logger/requestFilters';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./services/logger/sentry.server');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./services/logger/sentry.edge');
  }
}

// Unhandled errors from server components, route handlers and server actions.
// The request never reached a place that called setWhiteLabelContext, so tag
// host + the whitelabel the layout learned for it (`request.headers` is a
// plain object in Next's onRequestError signature).
export function onRequestError(error, request, context) {
  // Scanner traffic Next rejected while decoding the request (see
  // requestFilters.js). A log keeps it visible without an issue per probe;
  // the route pattern, never the path, which can carry a wallet id.
  if (isMalformedRequestError(error, request)) {
    Sentry.logger.warn('request.rejected', {
      reason: error.message,
      method: request?.method,
      route_type: context?.routeType,
      route_path: context?.routePath,
    });
    return;
  }
  const headers = request?.headers || {};
  const host = hostFromHeaderValue(headers['x-forwarded-host'] ?? headers.host);
  const known = getWhiteLabelForHost(host);
  Sentry.withScope(scope => {
    scope.setTags({
      host,
      whitelabel:
        typeof known?.name === 'string' ? known.name.toLowerCase() : undefined,
      white_label_id: known?.id,
    });
    Sentry.captureRequestError(error, request, context);
  });
}
