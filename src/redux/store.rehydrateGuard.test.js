/**
 * A plain slice whose stored copy cannot be read back must never be
 * overwritten with the initial state redux-persist falls back to.
 */
import 'fake-indexeddb/auto';
import {IDBFactory} from 'fake-indexeddb';
import {signUpSuccess} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import * as secureStore from 'security/secureStore';
import {bootstrapStorage, resetBootstrap} from 'redux/storage/bootstrap';
import {plainKv, stateDatabase} from 'redux/storage/stateDb';
import {captureError, logger} from 'services/logger';

jest.mock('services/logger', () => ({
  addBreadcrumb: jest.fn(),
  captureError: jest.fn(),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('dok-wallet-blockchain-networks/cryptoChain', () => ({
  getChain: jest.fn(),
  getCoin: jest.fn(),
  getHashString: jest.fn(),
}));
jest.mock('myWallet/wallet.service', () => ({
  addCustomDeriveAddressToWallet: jest.fn(),
  addDeriveAddresses: jest.fn(),
  generateMnemonics: jest.fn(),
}));
jest.mock('dok-wallet-blockchain-networks/service/dokApi', () => ({
  fetchCoinByChainAPI: jest.fn(),
  fetchCurrenciesAPI: jest.fn(),
  registerUserAPI: jest.fn(() => Promise.resolve()),
  reportExchangeTransactionHash: jest.fn(),
}));
jest.mock('dok-wallet-blockchain-networks/service/coinMarketCap', () => ({
  getPrice: jest.fn(() => Promise.resolve({})),
}));
jest.mock('utils/toast', () => ({showToast: jest.fn()}));
jest.mock('utils/navigation', () => ({MainNavigation: {}}));
jest.mock('utils/localStorageData', () => ({
  clearWalletConnectStorageCache: jest.fn(async () => {}),
  getAIDFromLocalStorage: jest.fn(() => null),
}));
jest.mock('dok-wallet-blockchain-networks/security/vaultCore', () => {
  const actual = jest.requireActual(
    'dok-wallet-blockchain-networks/security/vaultCore',
  );
  return {
    ...actual,
    wrapDek: (dek, password, options = {}) =>
      actual.wrapDek(dek, password, {iterations: 1000, ...options}),
  };
});

global.window = global.window || {};
global.localStorage = global.localStorage || {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const waitFor = async (predicate, timeout = 4000) => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timed out');
    }
    await new Promise(r => setTimeout(r, 10));
  }
};

describe('failed rehydrate guard', () => {
  it('blocks writes to an unreadable plain slice and reports it', async () => {
    await stateDatabase.close();
    await secureStore.close();
    global.indexedDB = new IDBFactory();
    resetBootstrap();
    await bootstrapStorage();
    await plainKv.set('persist:auth', 'not json');

    const {store, persistor} = require('redux/store');
    await waitFor(() => persistor.getState().bootstrapped);
    store.dispatch(signUpSuccess());
    await persistor.flush();

    expect(await plainKv.get('persist:auth')).toBe('not json');
    expect(logger.error).toHaveBeenCalledWith('storage.rehydrate_failed', {
      slice: 'auth',
    });
    expect(captureError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tags: expect.objectContaining({op: 'rehydrate_failed', slice: 'auth'}),
      }),
    );
    // The readable slice still persists normally.
    expect(await plainKv.get('persist:settings')).toEqual(expect.any(String));
  });
});
