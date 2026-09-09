import {rejectedActionBreadcrumb} from './sentryMiddleware';
import {addBreadcrumb} from 'services/logger';

jest.mock('services/logger', () => ({addBreadcrumb: jest.fn()}));

const run = action => {
  const next = jest.fn(a => a);
  const result = rejectedActionBreadcrumb()(next)(action);
  return {next, result};
};

beforeEach(() => jest.clearAllMocks());

describe('rejectedActionBreadcrumb', () => {
  it('records a warning breadcrumb for every rejected thunk', () => {
    run({
      type: 'exchange/calculateExchange/rejected',
      error: {message: 'Network Error'},
      payload: 'Something went wrong',
    });
    expect(addBreadcrumb).toHaveBeenCalledWith(
      'redux',
      'exchange/calculateExchange/rejected',
      {error: 'Network Error', payload: 'Something went wrong'},
      'warning',
    );
  });

  it('drops object payloads, which can carry wallet data', () => {
    run({type: 'wallets/createWallet/rejected', payload: {phrase: 'x'}});
    expect(addBreadcrumb.mock.calls[0][2]).toEqual({
      error: undefined,
      payload: undefined,
    });
  });

  it('ignores every other action and always calls next', () => {
    const {next, result} = run({type: 'wallets/createWallet/fulfilled'});
    expect(addBreadcrumb).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(result).toEqual({type: 'wallets/createWallet/fulfilled'});
  });
});
