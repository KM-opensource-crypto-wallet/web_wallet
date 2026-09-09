import {
  baseOptions,
  beforeBreadcrumb,
  beforeSend,
  beforeSendLog,
  environment,
  isSentryEnabled,
} from './sentryOptions';

const HEX64 = 'a'.repeat(64);
const MNEMONIC =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';

const withEnv = (vars, fn) => {
  const saved = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

describe('isSentryEnabled', () => {
  it('is off without a DSN', () => {
    withEnv({NEXT_PUBLIC_SENTRY_DSN: undefined, NODE_ENV: 'production'}, () =>
      expect(isSentryEnabled()).toBe(false),
    );
  });

  it('is on in production with a DSN', () => {
    withEnv(
      {
        NEXT_PUBLIC_SENTRY_DSN: 'https://k@o1.ingest.us.sentry.io/1',
        NODE_ENV: 'production',
      },
      () => expect(isSentryEnabled()).toBe(true),
    );
  });

  it('is off in development unless SENTRY_ENABLE_IN_DEV is set', () => {
    const dsn = {
      NEXT_PUBLIC_SENTRY_DSN: 'https://k@o1.ingest.us.sentry.io/1',
      NODE_ENV: 'development',
    };
    withEnv({...dsn, SENTRY_ENABLE_IN_DEV: undefined}, () =>
      expect(isSentryEnabled()).toBe(false),
    );
    withEnv({...dsn, SENTRY_ENABLE_IN_DEV: 'true'}, () =>
      expect(isSentryEnabled()).toBe(true),
    );
  });
});

describe('environment', () => {
  it('follows the ENV_MODE switch the app already uses', () => {
    withEnv({ENV_MODE: 'DEV'}, () => expect(environment()).toBe('development'));
    withEnv({ENV_MODE: 'PROD'}, () => expect(environment()).toBe('production'));
    withEnv({ENV_MODE: undefined}, () =>
      expect(environment()).toBe('production'),
    );
  });
});

describe('baseOptions', () => {
  it('captures errors, logs and breadcrumbs only', () => {
    const options = baseOptions();
    expect(options.enableLogs).toBe(true);
    expect(options.tracesSampleRate).toBe(0);
    expect(options.sendDefaultPii).toBe(false);
    expect(options.maxBreadcrumbs).toBe(50);
    expect(options.ignoreErrors.length).toBeGreaterThan(0);
    expect(options.beforeSend).toBe(beforeSend);
    expect(options.beforeBreadcrumb).toBe(beforeBreadcrumb);
    expect(options.beforeSendLog).toBe(beforeSendLog);
  });

  it('names the release after the package version', () => {
    withEnv({APP_NAME: 'dokwallet-desktop', APP_VERSION: '0.1.7'}, () =>
      expect(baseOptions().release).toBe('dokwallet-desktop@0.1.7'),
    );
  });

  it('only turns on SDK debug output in development when asked', () => {
    withEnv({ENV_MODE: 'DEV', SENTRY_DEBUG: 'true'}, () =>
      expect(baseOptions().debug).toBe(true),
    );
    withEnv({ENV_MODE: 'PROD', SENTRY_DEBUG: 'true'}, () =>
      expect(baseOptions().debug).toBe(false),
    );
  });
});

describe('beforeSend', () => {
  it('scrubs the message, exception values, extra and tags', () => {
    const event = beforeSend({
      message: `Phrase: ${MNEMONIC}`,
      exception: {values: [{value: `key ${HEX64}`}]},
      extra: {privateKey: HEX64, tx_hash: HEX64, chain: 'ethereum'},
      tags: {password: 'x', area: 'send'},
    });
    expect(event.message).toBe('Phrase: [REDACTED_MNEMONIC]');
    expect(event.exception.values[0].value).toBe('key [REDACTED_HEX]');
    expect(event.extra).toEqual({tx_hash: HEX64, chain: 'ethereum'});
    expect(event.tags).toEqual({area: 'send'});
  });

  it('keeps only the user id and drops the request', () => {
    const event = beforeSend({
      user: {id: 'abc', ip_address: '1.2.3.4', email: 'x@y.z'},
      request: {url: 'https://x', headers: {cookie: 'a'}},
    });
    expect(event.user).toEqual({id: 'abc'});
    expect(event.request).toBeUndefined();
  });

  it('drops a user without an id', () => {
    expect(beforeSend({user: {ip_address: '1.2.3.4'}}).user).toBeUndefined();
  });
});

describe('beforeBreadcrumb', () => {
  it('drops console breadcrumbs below info', () => {
    expect(beforeBreadcrumb({category: 'console', level: 'log'})).toBeNull();
    expect(beforeBreadcrumb({category: 'console', level: 'debug'})).toBeNull();
    expect(
      beforeBreadcrumb({category: 'console', level: 'warning'}),
    ).not.toBeNull();
  });

  it('scrubs message and data on other breadcrumbs', () => {
    const crumb = beforeBreadcrumb({
      category: 'ui.toast',
      level: 'error',
      message: `sent ${HEX64}`,
      data: {phrase: MNEMONIC, tx_hash: HEX64, ok: true},
    });
    expect(crumb.message).toBe('sent [REDACTED_HEX]');
    expect(crumb.data).toEqual({tx_hash: HEX64, ok: true});
  });
});

describe('beforeSendLog', () => {
  it('scrubs message and attributes', () => {
    const log = beforeSendLog({
      level: 'info',
      message: `Imported: ${MNEMONIC}`,
      attributes: {privateKey: HEX64, tx_hash: HEX64, chain: 'solana'},
    });
    expect(log.message).toBe('Imported: [REDACTED_MNEMONIC]');
    expect(log.attributes).toEqual({tx_hash: HEX64, chain: 'solana'});
  });
});
