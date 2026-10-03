import {parseEnvelopeDsn, resolveTunnelTarget, TUNNEL_PATH} from './tunnel';

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
