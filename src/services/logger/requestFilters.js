// Requests that Next.js / React reject while decoding them, before any app
// code runs. Internet scanners send them: multipart POSTs without a boundary,
// forged Server Action payloads (React Flight reply probes in the style of
// CVE-2025-55182), cross-site posts to Server Actions, garbled router-state
// headers. Next answers each of them itself; nothing in the app can fix the
// request, so onRequestError logs them instead of opening issues.
//
// Pure and dependency-free (loaded by src/instrumentation.js in every server
// runtime). Matching is on exact messages from Next 16's compiled runtime,
// never on routeType: Next reports the render that follows an action as
// 'render' (DOKWALLET-WALLET-WEB-1Q), and decoder errors are often thrown
// from a later `then`, so there is no decodeReply frame to look for.

// React's Server Action reply decoder (decodeReply / decodeAction) and the
// multipart / urlencoded body parsers in front of it. Only a POST carries a
// body for them to reject.
const MALFORMED_BODY_MESSAGES = new Set([
  'Connection closed.',
  'Invalid reference.',
  'Invalid forward reference.',
  'Referenced Blob is not a Blob.',
  'Already initialized typed array.',
  'Already initialized stream.',
  'Already initialized Map.',
  'Already initialized Set.',
  'Already initialized Iterator.',
  'Invalid Map initializer.',
  'Invalid Set initializer.',
  'Invalid Iterator initializer.',
  'Invalid data for bytes stream.',
  'Reply finished with incomplete file part.',
  'Malformed urlencoded form',
  'Malformed part header',
  'Malformed content type',
  'Unexpected end of form',
  'Multipart: Boundary not found',
  // undici, when Next parses a multipart POST that has no boundary.
  'Failed to parse body as FormData.',
]);
const MALFORMED_BODY_PREFIX = 'Maximum array nesting exceeded';

// The Next-Router-State-Tree header our client sends always parses; only a
// forged or mangled request trips this, on any method.
const ROUTER_STATE_MESSAGE =
  'The router state header was sent but could not be parsed.';

// Next's CSRF check for Server Actions: the Origin host differs from the
// forwarded host (exact string compare, ports included).
const CSRF_MESSAGE = 'Invalid Server Actions request.';

const firstHeader = value => (Array.isArray(value) ? value[0] : value);

// Lower-case host without port; for a comma-separated x-forwarded-host the
// first entry, as Next itself uses.
const normalizeHost = value => {
  if (typeof value !== 'string') {
    return null;
  }
  const host = value.split(',')[0].trim().toLowerCase();
  return host ? host.replace(/:\d+$/, '') : null;
};

const originHost = origin => {
  if (typeof origin !== 'string' || origin === 'null') {
    return null;
  }
  try {
    return normalizeHost(new URL(origin).host);
  } catch (e) {
    return null;
  }
};

// Dropped only when the sites really differ. A port-only mismatch (a brand's
// proxy forwarding `host:443`) fails every real user's Server Action and must
// stay visible, as must a request whose Origin or host is unknown.
const isCrossSitePost = headers => {
  const origin = originHost(firstHeader(headers?.origin));
  const host = normalizeHost(
    firstHeader(headers?.['x-forwarded-host']) ?? firstHeader(headers?.host),
  );
  return Boolean(origin && host && origin !== host);
};

export const isMalformedRequestError = (error, request) => {
  const message = typeof error?.message === 'string' ? error.message : '';
  if (!message) {
    return false;
  }
  if (message === ROUTER_STATE_MESSAGE) {
    return true;
  }
  if (String(request?.method || '').toUpperCase() !== 'POST') {
    return false;
  }
  if (
    MALFORMED_BODY_MESSAGES.has(message) ||
    message.startsWith(MALFORMED_BODY_PREFIX)
  ) {
    return true;
  }
  return message === CSRF_MESSAGE && isCrossSitePost(request?.headers);
};
