/**
 * The real web root reducer + redux-persist over the IndexedDB adapters:
 * plain slices land in the plain store, wallet data lands sealed, and nothing
 * anywhere at rest contains a secret.
 */
import 'fake-indexeddb/auto';
import {IDBFactory} from 'fake-indexeddb';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {
  assertNoSecrets,
  extractVaultPayload,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletSecrets';
import {parsePersistEnvelope} from 'dok-wallet-blockchain-networks/redux/storage/legacyRootMigration';
import {signUpSuccess} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {setWalletHideSettings} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import * as secureStore from 'security/secureStore';
import {resetBootstrap} from 'redux/storage/bootstrap';
import {plainKv, stateDatabase} from 'redux/storage/stateDb';
import {
  __resetSealedForTests,
  listSealedKeys,
  readSealed,
} from 'redux/storage/sealedStorage';

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

const HEX = i => `0x${String(i).padStart(2, '0').repeat(32)}`;
const MNEMONIC = 'abandon '.repeat(11) + 'about';
const newStoreWallet = () => ({
  clientId: 'w1',
  walletName: 'Main',
  phrase: MNEMONIC,
  coins: [
    {
      _id: 'c1',
      chain_name: 'ethereum',
      symbol: 'ETH',
      address: '0xa0',
      privateKey: HEX(1),
      deriveAddresses: [
        {address: '0xa0', derivePath: "m/44'/60'/0'/0/0", privateKey: HEX(1)},
      ],
    },
  ],
  chain_existing_coin: {},
});

const waitFor = async (predicate, timeout = 4000) => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timed out');
    }
    await new Promise(r => setTimeout(r, 10));
  }
};

describe('web store persistence guard', () => {
  let store;
  let persistor;
  let vaultSync;

  beforeAll(async () => {
    await stateDatabase.close();
    await secureStore.close();
    global.indexedDB = new IDBFactory();
    resetBootstrap();
    __resetSealedForTests();
    vault.__resetForTests();
    ({store, persistor, vaultSync} = require('redux/store'));
    await waitFor(() => persistor.getState().bootstrapped);
  });

  it('plain slices persist before unlock; sealed writes are dropped', async () => {
    store.dispatch(signUpSuccess('Secret123!'));
    await persistor.flush();
    const auth = parsePersistEnvelope(await plainKv.get('persist:auth'));
    expect(auth.hasAccount).toBe(true);
    expect(auth.password).toBeUndefined();
    expect(auth.isVaultUnlocked).toBeUndefined();
    expect(await plainKv.get('persist:settings')).toEqual(expect.any(String));
    // Locked: nothing sealed may be written.
    expect(await listSealedKeys()).toEqual([]);
    expect(await plainKv.get('persist:wallets')).toBeNull();
  });

  it('after createAccount, wallet data is sealed without secrets and mirrored to the vault', async () => {
    const {createAccount} = require('security/unlockFlow');
    await store.dispatch(createAccount('Secret123!'));
    store.dispatch({
      type: 'wallets/createWallet/fulfilled',
      payload: {newStoreWallet: newStoreWallet(), isFromImportWallet: false},
    });
    store.dispatch(
      setWalletHideSettings({
        clientId: 'w1',
        secretCodeSalt: 'b'.repeat(32),
        secretCodeHash: 'a'.repeat(64),
        secretCodeIterations: 100000,
        relockOption: 'MANUAL',
      }),
    );
    await persistor.flush();
    await vaultSync.flush();

    expect(store.getState().wallets.allWallets[0].phrase).toBe(MNEMONIC);

    const stateKey = await vault.getStateKey();
    const sealedWallets = parsePersistEnvelope(
      await readSealed('persist:wallets', stateKey),
    );
    expect(sealedWallets.allWallets[0].walletName).toBe('Main');
    expect(sealedWallets.allWallets[0].hideSettings.relockOption).toBe(
      'MANUAL',
    );
    expect(() =>
      assertNoSecrets(sealedWallets, {allowHexKeys: ['secretCodeHash']}),
    ).not.toThrow();
    // Ciphertext at rest, never the wallet name in the clear.
    const raw = await require('redux/storage/stateDb').sealedKv.get(
      'persist:wallets',
    );
    expect(JSON.stringify(raw)).not.toContain('Main');
    // Plain store holds no wallet data.
    expect(await plainKv.get('persist:wallets')).toBeNull();

    expect(await vault.readSecrets()).toEqual(
      extractVaultPayload(store.getState().wallets.allWallets),
    );
  });
});
