// Sentry tunnel: the browser SDK posts envelopes to our own origin (so ad
// blockers cannot drop them) and src/app/monitoring/route.js forwards them.
// A route handler instead of withSentryConfig's `tunnelRoute` rewrite: Next
// 16.3 serves external rewrites through its httpxy proxy, which put 11
// `close` listeners on every tunnelled response (MaxListenersExceededWarning,
// vercel/next.js#97757). Pure: no Next, no SDK.

// Matches `trailingSlash: true`, so the POST is not bounced by a 308.
export const TUNNEL_PATH = '/monitoring/';

// The endpoint is unauthenticated, so the body is capped before it is held in
// memory. 1 MiB is above anything the browser SDK sends here (log batches
// flush at an ~800k size estimate, strings are scrubbed to 1 KB, no replay or
// attachments) and Sentry rejects a single event over 1 MB anyway.
export const MAX_ENVELOPE_BYTES = 1024 * 1024;

// Reads a web ReadableStream, giving up as soon as it passes `limit` bytes.
// Returns the bytes, or null when the limit was exceeded.
export const readBodyWithLimit = async (stream, limit) => {
  if (!stream) {
    return new Uint8Array(0);
  }
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
};

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
