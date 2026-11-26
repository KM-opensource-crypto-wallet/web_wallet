jest.mock('dok-wallet-blockchain-networks/config/dokApi', () => ({
  DokApi: {get: jest.fn(), post: jest.fn()},
}));

import {DokApi} from 'dok-wallet-blockchain-networks/config/dokApi';
import {getStarters, mapResponse, send} from './supportChatApi';

const ok = {v: 1, outcome: 'answered', answer: 'x', related: []};

describe('mapResponse', () => {
  const base = {tokenSent: true, online: true, kind: 'answer'};
  const map = over => mapResponse({...base, ...over});

  it('200 with v1 and a known outcome is ok', () => {
    expect(map({status: 200, body: ok})).toBe('ok');
    for (const outcome of ['not_covered', 'secret_blocked']) {
      expect(map({status: 200, body: {v: 1, outcome}})).toBe('ok');
    }
  });

  it('200 starters needs an array of starters', () => {
    const kind = 'starters';
    expect(map({status: 200, kind, body: {v: 1, starters: []}})).toBe('ok');
    expect(map({status: 200, kind, body: {v: 1}})).toBe('unavailable');
    expect(map({status: 200, kind, body: ok})).toBe('unavailable');
  });

  it('200 with an unknown outcome, no v, or a non-object body is unavailable', () => {
    expect(map({status: 200, body: {v: 1, outcome: 'weird'}})).toBe(
      'unavailable',
    );
    expect(map({status: 200, body: {outcome: 'answered'}})).toBe('unavailable');
    expect(map({status: 200, body: null})).toBe('unavailable');
    expect(map({status: 200, body: 'ok'})).toBe('unavailable');
    expect(map({status: 200, body: '<html>'})).toBe('unavailable');
  });

  it('maps the v1 error codes', () => {
    expect(map({status: 404, body: {v: 1, code: 'disabled'}})).toBe('hide');
    expect(map({status: 400, body: {v: 1, code: 'invalid'}})).toBe('invalid');
    expect(map({status: 429, body: {v: 1, code: 'rate_limited'}})).toBe(
      'rate_limited',
    );
    expect(map({status: 503, body: {v: 1, code: 'busy'}})).toBe('busy');
    expect(map({status: 503, body: {v: 1, code: 'unavailable'}})).toBe(
      'unavailable',
    );
  });

  it('a status/code mismatch is unavailable', () => {
    expect(map({status: 400, body: {v: 1, code: 'disabled'}})).toBe(
      'unavailable',
    );
    expect(map({status: 404, body: {v: 1, code: 'invalid'}})).toBe(
      'unavailable',
    );
    expect(map({status: 500, body: {v: 1, code: 'busy'}})).toBe('unavailable');
  });

  it('401/403 without v: captcha when no token was sent', () => {
    expect(
      map({status: 401, tokenSent: false, body: 'Missing x-captcha-token'}),
    ).toBe('captcha');
    expect(map({status: 403, tokenSent: false, body: null})).toBe('captcha');
    expect(map({status: 401, tokenSent: false, body: {message: 'x'}})).toBe(
      'captcha',
    );
  });

  it('401/403 without v and with a token: captcha only when the body mentions it', () => {
    expect(
      map({status: 403, body: {error: 'CAPTCHA verification failed'}}),
    ).toBe('captcha');
    expect(map({status: 403, body: 'Captcha rejected'})).toBe('captcha');
    expect(map({status: 401, body: {message: 'Forbidden'}})).toBe(
      'unavailable',
    );
    expect(map({status: 403, body: '<html>Forbidden</html>'})).toBe(
      'unavailable',
    );
    expect(map({status: 403, body: null})).toBe('unavailable');
  });

  it('401/403 with a v1 body is never captcha', () => {
    expect(map({status: 403, tokenSent: false, body: {v: 1, code: 'x'}})).toBe(
      'unavailable',
    );
  });

  it('gateway 403/429/404 without v are unavailable', () => {
    expect(map({status: 429, body: {message: 'Too Many Requests'}})).toBe(
      'unavailable',
    );
    expect(map({status: 404, body: {message: 'Not Found'}})).toBe(
      'unavailable',
    );
    expect(map({status: 403, body: {message: 'Forbidden'}})).toBe(
      'unavailable',
    );
    expect(map({status: 502, body: '<html>Bad gateway</html>'})).toBe(
      'unavailable',
    );
  });

  it('network failure: offline only when the browser is offline', () => {
    expect(map({status: null, body: null, online: false})).toBe('offline');
    expect(map({status: null, body: null, online: true})).toBe('unavailable');
  });

  it('never throws on a circular body', () => {
    const body = {};
    body.self = body;
    expect(map({status: 403, body})).toBe('unavailable');
  });
});

describe('getStarters and send', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getStarters adds the route pattern only when there is one', async () => {
    DokApi.get.mockResolvedValue({status: 200, data: {}, config: {}});
    await getStarters(undefined, '/wallet/[clientId]/swap');
    expect(DokApi.get.mock.calls[0][1].params).toEqual({
      v: 1,
      path: '/wallet/[clientId]/swap',
    });
    await getStarters(undefined, null);
    expect(DokApi.get.mock.calls[1][1].params).toEqual({v: 1});
  });

  it('getStarters passes the signal, v=1 and validateStatus', async () => {
    const signal = new AbortController().signal;
    DokApi.get.mockResolvedValue({
      status: 200,
      data: {v: 1, starters: []},
      config: {headers: {'x-captcha-token': 't'}},
    });
    const res = await getStarters(signal);
    expect(res).toEqual({
      status: 200,
      body: {v: 1, starters: []},
      tokenSent: true,
    });
    const [path, opts] = DokApi.get.mock.calls[0];
    expect(path).toBe('/support-chat');
    expect(opts.params).toEqual({v: 1});
    expect(opts.signal).toBe(signal);
    expect(opts.timeout).toBe(0);
    expect(opts.validateStatus(503)).toBe(true);
  });

  it('send posts the body and reports a missing token', async () => {
    DokApi.post.mockResolvedValue({
      status: 401,
      data: 'Missing',
      config: {headers: {}},
    });
    const res = await send({v: 1, type: 'chip', entryId: 'a'}, undefined);
    expect(res).toEqual({status: 401, body: 'Missing', tokenSent: false});
    expect(DokApi.post.mock.calls[0][1]).toEqual({
      v: 1,
      type: 'chip',
      entryId: 'a',
    });
  });

  it('a network error gives status null and reads the token from error.config', async () => {
    DokApi.post.mockRejectedValue({
      config: {headers: {'x-captcha-token': 't'}},
    });
    expect(await send({}, undefined)).toEqual({
      status: null,
      body: null,
      tokenSent: true,
    });
    DokApi.get.mockRejectedValue(new Error('Network Error'));
    expect(await getStarters(undefined)).toEqual({
      status: null,
      body: null,
      tokenSent: false,
    });
  });

  it('an abort resolves to {aborted:true}', async () => {
    const controller = new AbortController();
    controller.abort();
    DokApi.post.mockRejectedValue(
      Object.assign(new Error('c'), {code: 'ERR_CANCELED'}),
    );
    expect(await send({}, controller.signal)).toEqual({aborted: true});
    DokApi.get.mockRejectedValue(new Error('x'));
    expect(await getStarters(controller.signal)).toEqual({aborted: true});
  });

  it('never logs message or answer text', async () => {
    const spies = ['log', 'warn', 'error', 'info', 'debug'].map(m =>
      jest.spyOn(console, m).mockImplementation(() => {}),
    );
    DokApi.post.mockResolvedValue({
      status: 200,
      data: {v: 1, outcome: 'answered', answer: 'ANSWER-TEXT', related: []},
      config: {headers: {}},
    });
    const res = await send({
      v: 1,
      type: 'text',
      message: 'PRIVATE-TEXT',
      history: [],
    });
    mapResponse({...res, online: true});
    DokApi.post.mockRejectedValue(new Error('boom'));
    await send({v: 1, type: 'text', message: 'PRIVATE-TEXT', history: []});
    spies.forEach(spy => {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
