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
});

describe('response interceptor', () => {
  let warn;
  beforeEach(() => {
    resetCaptchaLogThrottle();
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
