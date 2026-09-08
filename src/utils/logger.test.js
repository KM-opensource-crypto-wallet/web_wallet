import {logWalletConnectEvent} from './logger';

describe('logWalletConnectEvent', () => {
  afterEach(() => jest.restoreAllMocks());

  it('writes a tagged message and a JSON payload at the given level', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logWalletConnectEvent('warn', 'session_request.unsupported_method', {
      method: 'eth_foo',
      chainId: 'eip155:1',
    });
    expect(warn).toHaveBeenCalledTimes(1);
    const [tag, json] = warn.mock.calls[0];
    expect(tag).toBe('[WalletConnect] session_request.unsupported_method');
    const payload = JSON.parse(json);
    expect(payload).toMatchObject({
      event: 'session_request.unsupported_method',
      method: 'eth_foo',
      chainId: 'eip155:1',
    });
    expect(new Date(payload.ts).toString()).not.toBe('Invalid Date');
  });

  it('falls back to console.log for an unknown level', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    logWalletConnectEvent('verbose', 'x');
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][1])).toMatchObject({event: 'x'});
  });
});
