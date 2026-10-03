import {POST} from './route';
import {MAX_ENVELOPE_BYTES} from 'services/logger/tunnel';

const OUR_DSN = 'https://abc123@o4507.ingest.us.sentry.io/4512055212244992';
const TARGET =
  'https://o4507.ingest.us.sentry.io/api/4512055212244992/envelope/';

const envelope = dsn =>
  `${JSON.stringify({event_id: '1', dsn})}\n{"type":"event"}\n{"message":"hi"}`;

const post = (body, headers = {}) =>
  POST(
    new Request('http://localhost/monitoring/', {
      method: 'POST',
      body,
      headers,
    }),
  );

let savedDsn;
beforeEach(() => {
  savedDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  process.env.NEXT_PUBLIC_SENTRY_DSN = OUR_DSN;
  global.fetch = jest.fn(async () => new Response(null, {status: 200}));
});
afterEach(() => {
  process.env.NEXT_PUBLIC_SENTRY_DSN = savedDsn;
  delete global.fetch;
});

describe('POST /monitoring/', () => {
  it('forwards our envelope byte for byte with the client IP', async () => {
    const body = envelope(OUR_DSN);
    const res = await post(body, {'x-forwarded-for': '203.0.113.7'});
    expect(res.status).toBe(200);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe(TARGET);
    expect(init.headers).toEqual({
      'Content-Type': 'application/x-sentry-envelope',
      'X-Forwarded-For': '203.0.113.7',
    });
    expect(new TextDecoder().decode(init.body)).toBe(body);
  });

  it('rejects foreign or unreadable envelopes without forwarding', async () => {
    for (const body of [
      envelope('https://k@evil.example.com/4512055212244992'),
      '',
      'garbage',
    ]) {
      const res = await post(body);
      expect(res.status).toBe(400);
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('passes the upstream status through and reports network failure as 502', async () => {
    global.fetch.mockResolvedValueOnce(new Response(null, {status: 429}));
    expect((await post(envelope(OUR_DSN))).status).toBe(429);
    global.fetch.mockRejectedValueOnce(new Error('offline'));
    expect((await post(envelope(OUR_DSN))).status).toBe(502);
  });

  it('rejects a body over the limit with 413 without forwarding', async () => {
    const oversized = `${envelope(OUR_DSN)}${'x'.repeat(MAX_ENVELOPE_BYTES)}`;
    expect((await post(oversized)).status).toBe(413);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a declared content-length over the limit before reading', async () => {
    const res = await post(envelope(OUR_DSN), {
      'content-length': String(MAX_ENVELOPE_BYTES + 1),
    });
    expect(res.status).toBe(413);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
