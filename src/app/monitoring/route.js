import {NextResponse} from 'next/server';
import {
  MAX_ENVELOPE_BYTES,
  parseEnvelopeDsn,
  readBodyWithLimit,
  resolveTunnelTarget,
} from 'services/logger/tunnel';

const NEWLINE = 0x0a;

/**
 * POST /monitoring/
 *
 * Sentry tunnel (see services/logger/tunnel.js). Forwards browser envelopes
 * for this app's own DSN to Sentry ingest, byte for byte. The envelope is
 * never logged: it carries user context.
 */
export async function POST(request) {
  const declaredLength = Number(request.headers.get('content-length'));
  if (declaredLength > MAX_ENVELOPE_BYTES) {
    return new NextResponse(null, {status: 413});
  }
  // The declared length can be absent or wrong, so the stream is capped too.
  const body = await readBodyWithLimit(request.body, MAX_ENVELOPE_BYTES);
  if (!body) {
    return new NextResponse(null, {status: 413});
  }
  const headerEnd = body.indexOf(NEWLINE);
  const header = new TextDecoder().decode(
    headerEnd === -1 ? body : body.subarray(0, headerEnd),
  );
  const target = resolveTunnelTarget(
    parseEnvelopeDsn(header),
    process.env.NEXT_PUBLIC_SENTRY_DSN,
  );
  if (!target) {
    return new NextResponse(null, {status: 400});
  }

  const headers = {'Content-Type': 'application/x-sentry-envelope'};
  // Sentry derives the event's country from this; the rewrite tunnel passed
  // it through too. Without it every browser event would geolocate to us.
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    headers['X-Forwarded-For'] = forwardedFor;
  }

  try {
    const upstream = await fetch(target, {method: 'POST', headers, body});
    return new NextResponse(null, {status: upstream.status});
  } catch {
    return new NextResponse(null, {status: 502});
  }
}
