// Sentry tunnel: the browser SDK posts envelopes to our own origin (so ad
// blockers cannot drop them) and src/app/monitoring/route.js forwards them.
// A route handler instead of withSentryConfig's `tunnelRoute` rewrite: Next
// 16.3 serves external rewrites through its httpxy proxy, which put 11
// `close` listeners on every tunnelled response (MaxListenersExceededWarning,
// vercel/next.js#97757). Pure: no Next, no SDK.

// Matches `trailingSlash: true`, so the POST is not bounced by a 308.
export const TUNNEL_PATH = '/monitoring/';

const parseDsn = dsn => {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+|\/+$/g, '');
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      !/^\d+$/.test(projectId)
    ) {
      return null;
    }
    return {host: url.hostname, projectId};
  } catch {
    return null;
  }
};

// The envelope header is the first line, JSON with the DSN the SDK sent with.
export const parseEnvelopeDsn = bodyText => {
  if (typeof bodyText !== 'string') {
    return null;
  }
  const newline = bodyText.indexOf('\n');
  const header = newline === -1 ? bodyText : bodyText.slice(0, newline);
  try {
    const dsn = JSON.parse(header)?.dsn;
    return typeof dsn === 'string' ? dsn : null;
  } catch {
    return null;
  }
};

// Only our own project is forwarded, so the endpoint cannot be used as an
// open relay into Sentry. Returns the ingest URL, or null to reject.
export const resolveTunnelTarget = (dsn, allowedDsn) => {
  const requested = parseDsn(dsn);
  const allowed = parseDsn(allowedDsn);
  if (
    !requested ||
    !allowed ||
    requested.host !== allowed.host ||
    requested.projectId !== allowed.projectId
  ) {
    return null;
  }
  return `https://${allowed.host}/api/${allowed.projectId}/envelope/`;
};
