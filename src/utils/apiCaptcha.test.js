// Response-side diagnostics for captcha-protected API calls.
// Only fires on 403 so healthy users produce no extra log lines.

const makeFakeDokApi = () => {
  const handlers = {request: [], response: []};
  let nextId = 0;
  const mk = kind => ({
    use: jest.fn((onFulfilled, onRejected) => {
      const id = nextId++;
      handlers[kind].push({id, onFulfilled, onRejected});
      return id;
    }),
    eject: jest.fn(id => {
      handlers[kind] = handlers[kind].filter(h => h.id !== id);
    }),
  });
  return {
    interceptors: {request: mk('request'), response: mk('response')},
    _handlers: handlers,
  };
};

const fakeDokApi = makeFakeDokApi();

jest.mock('dok-wallet-blockchain-networks/config/dokApi', () => ({
  DokApi: fakeDokApi,
}));

const {
  setupWebCaptchaInterceptor,
  describeCaptchaFailure,
  resetCaptchaLogThrottle,
  resetCaptchaStats,
  captchaRef,
} = require('./apiCaptcha');

const TOKEN = 'HFODdpK05IaWpsOSFcFh1NF1tqPHsPKnINTmcmfkIyO08dXTcgeRd6aUh';

const make403 = (url = '/get-currency-rate', overrides = {}) => ({
  message: 'Request failed with status code 403',
  config: {url, headers: {'x-captcha-token': TOKEN}, ...overrides.config},
  response: {
    status: 403,
    data: {error: 'CAPTCHA verification failed: browser-error'},
    ...overrides.response,
  },
});

const lastResponseErrorHandler = () => {
  const list = fakeDokApi._handlers.response;
  return list[list.length - 1].onRejected;
};
const lastResponseOkHandler = () => {
  const list = fakeDokApi._handlers.response;
  return list[list.length - 1].onFulfilled;
};
const lastRequestHandler = () => {
  const list = fakeDokApi._handlers.request;
  return list[list.length - 1].onFulfilled;
};

describe('describeCaptchaFailure', () => {
  it('reports token length and a short prefix, never the full token', () => {
    const payload = describeCaptchaFailure(make403());
    expect(payload.url).toBe('/get-currency-rate');
    expect(payload.status).toBe(403);
    expect(payload.tokenSent).toBe(true);
    expect(payload.tokenLength).toBe(TOKEN.length);
    expect(payload.tokenPrefix).toBe(TOKEN.slice(0, 6));
    expect(JSON.stringify(payload)).not.toContain(TOKEN);
  });

  it('marks tokenSent false when the header is missing', () => {
    const err = make403('/x', {config: {url: '/x', headers: {}}});
    const payload = describeCaptchaFailure(err);
    expect(payload.tokenSent).toBe(false);
    expect(payload.tokenLength).toBe(0);
  });

  it('includes the response body as a truncated string', () => {
    const big = 'a'.repeat(2000);
    const err = make403('/x', {response: {status: 403, data: {msg: big}}});
    const payload = describeCaptchaFailure(err);
    expect(typeof payload.reason).toBe('string');
    expect(payload.reason.length).toBeLessThanOrEqual(500);
    expect(payload.reason).toContain('msg');
  });

  it('does not throw when browser globals are absent', () => {
    expect(() => describeCaptchaFailure({})).not.toThrow();
  });

  it('always carries the diagnostic sections, even without a DOM', () => {
    const payload = describeCaptchaFailure(make403());
    expect(payload).toHaveProperty('recaptcha');
    expect(payload.thirdPartyScripts).toEqual([]);
    expect(payload.stats).toEqual({
      executes: 0,
      inFlight: 0,
      maxInFlight: 0,
      ok: 0,
      rejected: 0,
    });
  });
});

describe('response interceptor', () => {
  let warn;
  beforeEach(() => {
    resetCaptchaLogThrottle();
    resetCaptchaStats();
    fakeDokApi.interceptors.request.use.mockClear();
    fakeDokApi.interceptors.response.use.mockClear();
    fakeDokApi.interceptors.request.eject.mockClear();
    fakeDokApi.interceptors.response.eject.mockClear();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setupWebCaptchaInterceptor('dokwallet');
  });
  afterEach(() => jest.restoreAllMocks());

  it('logs one tagged warning for a 403 and rethrows the same error', async () => {
    const err = make403();
    await expect(lastResponseErrorHandler()(err)).rejects.toBe(err);
    expect(warn).toHaveBeenCalledTimes(1);
    const [tag, json] = warn.mock.calls[0];
    expect(tag).toBe('[captcha] request rejected');
    const payload = JSON.parse(json);
    expect(payload).toMatchObject({
      url: '/get-currency-rate',
      status: 403,
      tokenSent: true,
    });
    expect(payload.reason).toContain('browser-error');
  });

  it('stays silent for non-403 errors', async () => {
    const err = {config: {url: '/x'}, response: {status: 500, data: 'boom'}};
    await expect(lastResponseErrorHandler()(err)).rejects.toBe(err);
    const net = {config: {url: '/x'}, message: 'Network Error'};
    await expect(lastResponseErrorHandler()(net)).rejects.toBe(net);
    expect(warn).not.toHaveBeenCalled();
  });

  it('stays silent for the bootstrap white-label call', async () => {
    const err = make403('/get-white-label');
    await expect(lastResponseErrorHandler()(err)).rejects.toBe(err);
    expect(warn).not.toHaveBeenCalled();
  });

  it('ignores a 403 on a request that carried no captcha token', async () => {
    // Nothing was sent for Google to reject, so this is an ordinary 403
    // (auth, permissions), not a captcha rejection.
    const err = make403('/x', {config: {url: '/x', headers: {}}});
    await expect(lastResponseErrorHandler()(err)).rejects.toBe(err);
    expect(warn).not.toHaveBeenCalled();
    expect(describeCaptchaFailure(make403()).stats.rejected).toBe(0);
  });

  it('throttles to one log per window, and resets on demand', async () => {
    const handler = lastResponseErrorHandler();
    await handler(make403('/a')).catch(() => {});
    await handler(make403('/b')).catch(() => {});
    await handler(make403('/c')).catch(() => {});
    expect(warn).toHaveBeenCalledTimes(1);
    resetCaptchaLogThrottle();
    await handler(make403('/d')).catch(() => {});
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('ejects both previous interceptors when set up again', () => {
    const reqId = fakeDokApi.interceptors.request.use.mock.results[0].value;
    const resId = fakeDokApi.interceptors.response.use.mock.results[0].value;
    setupWebCaptchaInterceptor('dokwallet');
    expect(fakeDokApi.interceptors.request.eject).toHaveBeenCalledWith(reqId);
    expect(fakeDokApi.interceptors.response.eject).toHaveBeenCalledWith(resId);
    expect(fakeDokApi._handlers.request).toHaveLength(1);
    expect(fakeDokApi._handlers.response).toHaveLength(1);
  });
});

describe('session counters', () => {
  let warn;
  beforeEach(() => {
    resetCaptchaLogThrottle();
    resetCaptchaStats();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // The request interceptor is a no-op server-side; pretend to be a browser.
    global.window = {};
    setupWebCaptchaInterceptor('dokwallet');
  });
  afterEach(() => {
    delete global.window;
    captchaRef.execute = null;
    jest.restoreAllMocks();
  });

  it('counts executes, peak concurrency, successes and rejections', async () => {
    let release;
    const gate = new Promise(r => (release = r));
    captchaRef.execute = jest.fn(async () => {
      await gate;
      return 'tok';
    });
    const req = lastRequestHandler();
    const a = req({url: '/a', headers: {}});
    const b = req({url: '/b', headers: {}});
    release();
    const [ca, cb] = await Promise.all([a, b]);
    expect(ca.headers['x-captcha-token']).toBe('tok');
    expect(cb.headers['x-captcha-token']).toBe('tok');

    lastResponseOkHandler()({config: ca});
    await lastResponseErrorHandler()(make403('/b')).catch(() => {});

    expect(warn).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(warn.mock.calls[0][1]);
    expect(payload.stats).toEqual({
      executes: 2,
      inFlight: 0,
      maxInFlight: 2,
      ok: 1,
      rejected: 1,
    });
  });

  it('does not count untokened successes such as the bootstrap call', () => {
    lastResponseOkHandler()({config: {url: '/get-white-label', headers: {}}});
    const payload = describeCaptchaFailure(make403());
    expect(payload.stats.ok).toBe(0);
  });
});
