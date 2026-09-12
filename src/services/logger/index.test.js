import * as Sentry from '@sentry/nextjs';
import {
  addBreadcrumb,
  attachDokApiLogging,
  captureError,
  logger,
  setUserContext,
  setWhiteLabelContext,
} from './index';

const HEX64 = 'a'.repeat(64);

beforeEach(() => jest.clearAllMocks());

describe('logger', () => {
  it('forwards each level to the Sentry logger', () => {
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');
    expect(Sentry.logger.debug).toHaveBeenCalledWith('a', undefined);
    expect(Sentry.logger.info).toHaveBeenCalledWith('b', undefined);
    expect(Sentry.logger.warn).toHaveBeenCalledWith('c', undefined);
    expect(Sentry.logger.error).toHaveBeenCalledWith('d', undefined);
  });

  it('flattens object attributes to scrubbed JSON and drops empty ones', () => {
    logger.info('send.submitted', {
      chain: 'ethereum',
      count: 2,
      ok: true,
      nested: {privateKey: HEX64, symbol: 'ETH'},
      missing: undefined,
      empty: null,
    });
    const [, attributes] = Sentry.logger.info.mock.calls[0];
    expect(attributes).toEqual({
      chain: 'ethereum',
      count: 2,
      ok: true,
      nested: '{"privateKey":"[REDACTED]","symbol":"ETH"}',
    });
  });

  it('never throws when the SDK does', () => {
    Sentry.logger.warn.mockImplementationOnce(() => {
      throw new Error('sdk down');
    });
    expect(() => logger.warn('x')).not.toThrow();
  });
});

describe('captureError', () => {
  it('passes an Error through with tags, extra and level', () => {
    const error = new Error('boom');
    captureError(error, {
      tags: {area: 'send'},
      extra: {chain: 'btc'},
      level: 'fatal',
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: {area: 'send'},
      extra: {chain: 'btc'},
      level: 'fatal',
    });
  });

  it('wraps strings and plain objects in an Error', () => {
    captureError('plain message');
    captureError({code: 42});
    const [[first], [second]] = Sentry.captureException.mock.calls;
    expect(first).toBeInstanceOf(Error);
    expect(first.message).toBe('plain message');
    expect(second).toBeInstanceOf(Error);
    expect(second.message).toBe('{"code":42}');
  });

  it('never throws when the SDK does', () => {
    Sentry.captureException.mockImplementationOnce(() => {
      throw new Error('sdk down');
    });
    expect(() => captureError(new Error('x'))).not.toThrow();
  });
});

describe('addBreadcrumb', () => {
  it('defaults to info level', () => {
    addBreadcrumb('wallet', 'reset', {reason: 'user'});
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'wallet',
      message: 'reset',
      data: {reason: 'user'},
      level: 'info',
    });
  });

  it('accepts an explicit level', () => {
    addBreadcrumb('redux', 'x/rejected', undefined, 'warning');
    expect(Sentry.addBreadcrumb.mock.calls[0][0].level).toBe('warning');
  });
});

describe('setUserContext', () => {
  it('sets the masterClientId as the user id', () => {
    setUserContext('client-1');
    expect(Sentry.setUser).toHaveBeenCalledWith({id: 'client-1'});
  });

  it('clears the user when the id is gone', () => {
    setUserContext(undefined);
    setUserContext(null);
    expect(Sentry.setUser).toHaveBeenNthCalledWith(1, null);
    expect(Sentry.setUser).toHaveBeenNthCalledWith(2, null);
  });
});

describe('setWhiteLabelContext', () => {
  it('tags events and logs with the normalised brand, id and host', () => {
    setWhiteLabelContext({
      name: 'KIML Wallet',
      id: '65ef',
      host: 'kimlview.xyz',
    });
    const expected = {
      whitelabel: 'kiml wallet',
      white_label_id: '65ef',
      host: 'kimlview.xyz',
    };
    expect(Sentry.setTags).toHaveBeenCalledWith(expected);
    expect(Sentry.setAttributes).toHaveBeenCalledWith(expected);
  });

  it('only sets the fields that are known', () => {
    setWhiteLabelContext({host: 'dokwallet.app'});
    expect(Sentry.setTags).toHaveBeenCalledWith({host: 'dokwallet.app'});
    expect(Sentry.setAttributes).toHaveBeenCalledWith({host: 'dokwallet.app'});
  });

  it('does nothing when there is nothing to set', () => {
    setWhiteLabelContext({});
    setWhiteLabelContext();
    expect(Sentry.setTags).not.toHaveBeenCalled();
    expect(Sentry.setAttributes).not.toHaveBeenCalled();
  });
});

describe('attachDokApiLogging', () => {
  const makeAxios = () => {
    const handlers = {};
    return {
      handlers,
      interceptors: {
        response: {
          use: jest.fn((onOk, onError) => {
            handlers.onOk = onOk;
            handlers.onError = onError;
            return 1;
          }),
        },
      },
    };
  };

  it('logs one warning per failed call without body, headers or query', async () => {
    const axios = makeAxios();
    attachDokApiLogging(axios);
    const error = {
      config: {
        method: 'post',
        url: '/v1/coins?apiKey=secret',
        data: {phrase: 'x'},
      },
      response: {
        status: 403,
        data: {code: 'CAPTCHA', message: 'm'.repeat(300), token: 'z'},
      },
      code: 'ERR_BAD_REQUEST',
    };
    await expect(axios.handlers.onError(error)).rejects.toBe(error);
    expect(Sentry.logger.warn).toHaveBeenCalledTimes(1);
    const [message, attributes] = Sentry.logger.warn.mock.calls[0];
    expect(message).toBe('dokapi.failed');
    expect(attributes).toEqual({
      method: 'POST',
      path: '/v1/coins',
      status: 403,
      code: 'ERR_BAD_REQUEST',
      backend_code: 'CAPTCHA',
      backend_message: 'm'.repeat(200),
    });
  });

  it('passes successful responses through untouched', () => {
    const axios = makeAxios();
    attachDokApiLogging(axios);
    const response = {status: 200};
    expect(axios.handlers.onOk(response)).toBe(response);
    expect(Sentry.logger.warn).not.toHaveBeenCalled();
  });
});

describe('dev console mirroring', () => {
  const withDevMode = fn => {
    const saved = process.env.ENV_MODE;
    process.env.ENV_MODE = 'DEV';
    try {
      fn();
    } finally {
      if (saved === undefined) {
        delete process.env.ENV_MODE;
      } else {
        process.env.ENV_MODE = saved;
      }
    }
  };

  it('prints through the un-instrumented console without the SDK sandbox', () => {
    // @sentry/nextjs does not export consoleSandbox (the RN SDK does); the
    // production build crashed during prerender when devPrint called it. The
    // SDK's console instrumentation keeps the original method on
    // `__sentry_original__`, which is what printing must go through so the
    // dev mirror is not re-captured as a Sentry Log.
    const original = jest.fn();
    const instrumented = jest.fn();
    instrumented.__sentry_original__ = original;
    const saved = console.log;
    console.log = instrumented;
    try {
      withDevMode(() => logger.info('hello', {a: 1}));
    } finally {
      console.log = saved;
    }
    expect(original).toHaveBeenCalledWith('[info] hello', {a: 1});
    expect(instrumented).not.toHaveBeenCalled();
    // The mock mirrors the real SDK surface: no consoleSandbox to lean on.
    expect(Sentry.consoleSandbox).toBeUndefined();
  });
});
