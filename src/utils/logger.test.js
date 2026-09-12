import {logWalletConnectEvent} from './logger';
import {addBreadcrumb, logger} from 'services/logger';

jest.mock('services/logger', () => ({
  addBreadcrumb: jest.fn(),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('logWalletConnectEvent', () => {
  it('forwards a structured log and a breadcrumb at the given level', () => {
    const details = {method: 'eth_foo', chainId: 'eip155:1'};
    logWalletConnectEvent(
      'warn',
      'session_request.unsupported_method',
      details,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'walletconnect.session_request.unsupported_method',
      details,
    );
    expect(addBreadcrumb).toHaveBeenCalledWith(
      'walletconnect',
      'session_request.unsupported_method',
      details,
      'warning',
    );
  });

  it('maps console-style levels onto logger levels', () => {
    logWalletConnectEvent('log', 'a');
    logWalletConnectEvent('error', 'b');
    logWalletConnectEvent('verbose', 'c');
    expect(logger.info).toHaveBeenCalledWith('walletconnect.a', {});
    expect(logger.error).toHaveBeenCalledWith('walletconnect.b', {});
    expect(logger.info).toHaveBeenCalledWith('walletconnect.c', {});
    expect(addBreadcrumb.mock.calls.map(call => call[3])).toEqual([
      'info',
      'error',
      'info',
    ]);
  });
});
