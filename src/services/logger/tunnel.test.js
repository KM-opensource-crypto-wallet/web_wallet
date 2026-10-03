import {
  parseEnvelopeDsn,
  readBodyWithLimit,
  resolveTunnelTarget,
  TUNNEL_PATH,
} from './tunnel';

// A pull stream of `count` chunks of `size` bytes that records how far it was
// read and whether the reader cancelled it.
const chunkedStream = (count, size) => {
  const state = {pulled: 0, cancelled: false};
  const stream = new ReadableStream({
    pull(controller) {
      if (state.pulled === count) {
        controller.close();
        return;
      }
      controller.enqueue(new Uint8Array(size).fill(state.pulled + 1));
      state.pulled += 1;
    },
    cancel() {
      state.cancelled = true;
    },
  });
  return {stream, state};
};

describe('readBodyWithLimit', () => {
  it('joins the chunks of a body under the limit', async () => {
    const {stream} = chunkedStream(3, 4);
    const body = await readBodyWithLimit(stream, 100);
    expect(Array.from(body)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
  });

  it('keeps a body exactly at the limit', async () => {
    const {stream} = chunkedStream(2, 5);
    expect((await readBodyWithLimit(stream, 10)).byteLength).toBe(10);
  });

  it('stops reading and cancels the stream once the limit is passed', async () => {
    const {stream, state} = chunkedStream(1000, 10);
    expect(await readBodyWithLimit(stream, 25)).toBeNull();
    expect(state.cancelled).toBe(true);
    expect(state.pulled).toBeLessThan(10);
  });

  it('treats a missing body as empty', async () => {
    expect((await readBodyWithLimit(null, 10)).byteLength).toBe(0);
  });
});

const OUR_DSN = 'https://abc123@o4507.ingest.us.sentry.io/4512055212244992';

const envelope = dsn =>
  `${JSON.stringify({event_id: '1', dsn, sent_at: 'now'})}\n{"type":"event"}\n{}`;

describe('parseEnvelopeDsn', () => {
  it('reads the DSN from the envelope header line', () => {
    expect(parseEnvelopeDsn(envelope(OUR_DSN))).toBe(OUR_DSN);
  });

  it('returns null for a missing, malformed or non-string header', () => {
    expect(parseEnvelopeDsn('')).toBeNull();
    expect(parseEnvelopeDsn('not json\n{}')).toBeNull();
    expect(parseEnvelopeDsn('{"event_id":"1"}\n{}')).toBeNull();
    expect(parseEnvelopeDsn('{"dsn":42}')).toBeNull();
    expect(parseEnvelopeDsn(undefined)).toBeNull();
  });
});

describe('resolveTunnelTarget', () => {
  it('forwards our own project to its ingest envelope endpoint', () => {
    expect(resolveTunnelTarget(OUR_DSN, OUR_DSN)).toBe(
      'https://o4507.ingest.us.sentry.io/api/4512055212244992/envelope/',
    );
  });

  it('accepts a different public key for the same project', () => {
    expect(
      resolveTunnelTarget(
        'https://otherkey@o4507.ingest.us.sentry.io/4512055212244992',
        OUR_DSN,
      ),
    ).not.toBeNull();
  });

  it('rejects other hosts and projects so it is not an open relay', () => {
    expect(
      resolveTunnelTarget(
        'https://k@evil.example.com/4512055212244992',
        OUR_DSN,
      ),
    ).toBeNull();
    expect(
      resolveTunnelTarget('https://k@o4507.ingest.us.sentry.io/1', OUR_DSN),
    ).toBeNull();
    expect(
      resolveTunnelTarget(
        'http://k@o4507.ingest.us.sentry.io/4512055212244992',
        OUR_DSN,
      ),
    ).toBeNull();
  });

  it('rejects everything when no DSN is configured or the input is bad', () => {
    expect(resolveTunnelTarget(OUR_DSN, undefined)).toBeNull();
    expect(resolveTunnelTarget(null, OUR_DSN)).toBeNull();
    expect(resolveTunnelTarget('not a url', OUR_DSN)).toBeNull();
  });
});

describe('TUNNEL_PATH', () => {
  it('ends with a slash to match trailingSlash: true', () => {
    expect(TUNNEL_PATH).toBe('/monitoring/');
  });
});
