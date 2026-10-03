import {POST} from './route';

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
});
