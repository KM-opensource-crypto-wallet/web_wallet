/**
 * Whitelabel identity for server-side Sentry tagging.
 *
 * Whitelabels are data, not code: the backend resolves the request Host to a
 * whitelabel (`getWhiteLabelInfo(host)` in app/layout.js) and adding a new
 * brand requires no frontend change. So there is no host->brand table here.
 * The layout remembers what the backend said for each host, and route handlers
 * / onRequestError look it up. A host the layout has not seen yet is tagged
 * with the host only; we never guess a brand.
 *
 * Pinned on globalThis because instrumentation.js and the app routes live in
 * different server bundles (separate module instances) of the same process.
 *
 * Kept free of client-only imports: src/instrumentation.js loads it into the
 * Node and edge runtimes before anything else.
 */
import {setWhiteLabelContext} from 'services/logger';

const CACHE_KEY = '__dokwallet_whitelabel_by_host__';

const cache = () => {
  if (!globalThis[CACHE_KEY]) {
    globalThis[CACHE_KEY] = new Map();
  }
  return globalThis[CACHE_KEY];
};

export function hostFromHeaderValue(value) {
  return (value ?? '').toLowerCase().split(':')[0];
}

export function rememberWhiteLabelForHost(host, wlData) {
  const key = hostFromHeaderValue(host);
  if (!key || !wlData || typeof wlData !== 'object') {
    return;
  }
  cache().set(key, {name: wlData.name, id: wlData._id});
}

export function getWhiteLabelForHost(host) {
  return cache().get(hostFromHeaderValue(host)) ?? null;
}

/**
 * Tag the current request's Sentry scope with host + whitelabel. Call once at
 * the top of a route handler; `req.headers` is a Fetch `Headers` instance.
 */
export function tagRequestScope(req) {
  const host = hostFromHeaderValue(
    req?.headers?.get?.('x-forwarded-host') ?? req?.headers?.get?.('host'),
  );
  const known = getWhiteLabelForHost(host);
  setWhiteLabelContext({host, name: known?.name, id: known?.id});
}
