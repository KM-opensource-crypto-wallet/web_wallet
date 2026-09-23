/**
 * The web unlock ordering: sealed slices rehydrate from IndexedDB after the
 * vault opens, and the persistoid may only write again once that has landed.
 * `redux/store` is replaced by a small real redux-persist store over a stub
 * wallets slice so the test exercises persistReducer/REHYDRATE for real.
 */
import 'fake-indexeddb/auto';
import {IDBFactory} from 'fake-indexeddb';
import Aes from 'crypto-js/aes';
import {configureStore, createSlice} from '@reduxjs/toolkit';
import {persistReducer, persistStore} from 'redux-persist';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {createVaultSync} from 'dok-wallet-blockchain-networks/security/vaultSync';
import {authSlice} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {buildPersistEnvelope} from 'dok-wallet-blockchain-networks/redux/storage/legacyRootMigration';
import * as secureStore from 'security/secureStore';
import {
  SCHEMA_VERSION,
  STORAGE_KEYS,
  bootstrapStorage,
  resetBootstrap,
} from 'redux/storage/bootstrap';
import {consumeOrphanLegacyState} from 'redux/storage/migrateLegacyRoot';
import {plainKv, stateDatabase} from 'redux/storage/stateDb';
import {LEGACY_ROOT_KEY} from 'redux/storage/wipe';
import {
  __resetSealedForTests,
  getDroppedSealedWrites,
  isSealedReadable,
  isSealedWritable,
  readSealed,
  sealedStorage,
} from 'redux/storage/sealedStorage';

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
jest.mock('utils/localStorageData', () => ({
  clearWalletConnectStorageCache: jest.fn(async () => {}),
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
// The wallets slice pulls every chain in; the unlock flow only dispatches its
// action creators, so a stub with the same action types is enough.
jest.mock('dok-wallet-blockchain-networks/redux/wallets/walletsSlice', () => {
  const {createSlice: cs} = jest.requireActual('@reduxjs/toolkit');
  const {hydrateWalletSecrets: hydrate, stripAllWalletsSecrets: stripAll} =
    jest.requireActual(
      'dok-wallet-blockchain-networks/redux/wallets/walletSecrets',
    );
  const slice = cs({
    name: 'wallets',
    initialState: {
      allWallets: [],
      currentWalletClientId: null,
      masterClientId: null,
    },
    reducers: {
      hydrateWalletSecrets: (state, {payload}) => {
        state.allWallets = hydrate(
          JSON.parse(JSON.stringify(state.allWallets)),
          payload,
        );
      },
      clearWalletSecrets: state => {
        state.allWallets = stripAll(
          JSON.parse(JSON.stringify(state.allWallets)),
        );
      },
      createIfNotExistsMasterClientId: state => {
        state.masterClientId = state.masterClientId || 'new-master';
      },
      resetCoinsToDefaultAddressForPrivacyMode: () => {},
      reassignCurrentWalletIfHidden: () => {},
      setWallets: (state, {payload}) => {
        state.allWallets = payload;
      },
    },
  });
  return {
    walletsSlice: slice,
    ...slice.actions,
    RELOCK_OPTIONS: {MANUAL: 'MANUAL'},
  };
});
jest.mock('redux/store', () => {
  const {configureStore: cfg} = jest.requireActual('@reduxjs/toolkit');
  const {
    persistReducer: pr,
    persistStore: ps,
    combineReducers,
  } = jest.requireActual('redux-persist');
  const {combineReducers: cr} = jest.requireActual('redux');
  const {walletsSlice} = jest.requireMock(
    'dok-wallet-blockchain-networks/redux/wallets/walletsSlice',
  );
  const {authSlice: auth} = jest.requireActual(
    'dok-wallet-blockchain-networks/redux/auth/authSlice',
  );
  const {sealedStorage: sealed} = jest.requireActual(
    'redux/storage/sealedStorage',
  );
  const {createVaultSync: mkSync} = jest.requireActual(
    'dok-wallet-blockchain-networks/security/vaultSync',
  );
  const walletsConfig = {
    key: 'wallets',
    storage: sealed,
    version: 1,
    timeout: 0,
    throttle: 0,
  };
  const SEALED_PERSIST_CONFIGS = {wallets: walletsConfig};
  const vaultSync = mkSync();
  const store = cfg({
    reducer: cr({
      wallets: pr(walletsConfig, walletsSlice.reducer),
      auth: auth.reducer,
    }),
    middleware: gdm =>
      gdm({serializableCheck: false}).prepend(vaultSync.middleware),
  });
  const persistor = ps(store);
  return {store, persistor, vaultSync, SEALED_PERSIST_CONFIGS};
});

const HEX = i => `0x${String(i).padStart(2, '0').repeat(32)}`;
const MNEMONIC = 'abandon '.repeat(11) + 'about';
const wallet = {
  clientId: 'w1',
  walletName: 'Main',
  phrase: MNEMONIC,
  coins: [
    {
      chain_name: 'ethereum',
      symbol: 'ETH',
      address: '0xa0',
      privateKey: HEX(1),
    },
  ],
};
const strippedWallet = {
  ...wallet,
  phrase: undefined,
  coins: [{chain_name: 'ethereum', symbol: 'ETH', address: '0xa0'}],
};

global.window = global.window || {};

// Legacy localStorage blob (crypto-js AES per field, see migrateLegacyRoot).
const SECRET_KEY = 'test';
process.env.REDUX_WEB_KEY = SECRET_KEY;
const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    clear: () => map.clear(),
  };
};
global.localStorage = memoryStorage();
const encryptField = value =>
  JSON.stringify(Aes.encrypt(JSON.stringify(value), SECRET_KEY).toString());
const legacyRoot = slices =>
  JSON.stringify({
    ...Object.fromEntries(
      Object.entries(slices).map(([k, v]) => [k, encryptField(v)]),
    ),
    _persist: encryptField({version: -1, rehydrated: true}),
  });

const waitFor = async (predicate, timeout = 3000) => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timed out');
    }
    await new Promise(r => setTimeout(r, 10));
  }
};

describe('web unlock flow', () => {
  beforeAll(async () => {
    await stateDatabase.close();
    await secureStore.close();
    global.indexedDB = new IDBFactory();
    resetBootstrap();
    __resetSealedForTests();
    vault.__resetForTests();
  });

  it('boot locked → sealed slice empty and writes dropped; unlock → rehydrated, then writes enabled', async () => {
    // Previous session: vault with the wallet's secrets, sealed wallets slice.
    await vault.createVault('pw');
    await vault.saveSecrets({
      v: 1,
      wallets: {
        w1: {
          phrase: MNEMONIC,
          coins: {ethereum_ETH: {privateKey: HEX(1)}},
          chainExisting: {},
          deriveKeys: {},
        },
      },
    });
    const stateKey = await vault.getStateKey();
    const {writeSealed} = require('redux/storage/sealedStorage');
    await writeSealed(
      'persist:wallets',
      buildPersistEnvelope({
        allWallets: [strippedWallet],
        currentWalletClientId: 'w1',
        masterClientId: 'master',
      }),
      stateKey,
    );
    vault.lock();
    __resetSealedForTests();

    // Fresh page load: the store module builds its persistor while locked.
    const {store, persistor} = require('redux/store');
    const {
      unlockWithPassword,
      __resetUnlockFlowForTests,
    } = require('security/unlockFlow');
    __resetUnlockFlowForTests();
    await waitFor(() => persistor.getState().bootstrapped);
    expect(store.getState().wallets.allWallets).toEqual([]);
    expect(isSealedReadable()).toBe(false);

    // redux-persist tries to persist the initial state; the adapter drops it.
    const {
      setWallets,
    } = require('dok-wallet-blockchain-networks/redux/wallets/walletsSlice');
    store.dispatch(setWallets([]));
    await persistor.flush();
    expect(getDroppedSealedWrites()).toBeGreaterThan(0);
    expect(await readSealed('persist:wallets', stateKey)).toContain('Main');

    await store.dispatch(unlockWithPassword('pw'));

    // Rehydrated from the sealed store and the vault.
    const live = store.getState().wallets;
    expect(live.currentWalletClientId).toBe('w1');
    expect(live.masterClientId).toBe('master');
    expect(live.allWallets[0].phrase).toBe(MNEMONIC);
    expect(live.allWallets[0].coins[0].privateKey).toBe(HEX(1));
    expect(store.getState().auth.isVaultUnlocked).toBe(true);
    expect(isSealedWritable()).toBe(true);

    // Writes now reach the sealed store, still without secrets... the stub
    // slice has no strip transform, so just check the write lands.
    store.dispatch(setWallets([{...wallet, walletName: 'Renamed'}]));
    await persistor.flush();
    expect(await readSealed('persist:wallets', stateKey)).toContain('Renamed');
  });

  it('wrong password leaves everything sealed', async () => {
    vault.lock();
    __resetSealedForTests();
    const {store} = require('redux/store');
    const {
      unlockWithPassword,
      __resetUnlockFlowForTests,
    } = require('security/unlockFlow');
    __resetUnlockFlowForTests();
    await expect(
      store.dispatch(unlockWithPassword('nope')),
    ).rejects.toMatchObject({
      code: 'invalid_password',
    });
    expect(isSealedReadable()).toBe(false);
    expect(isSealedWritable()).toBe(false);
  });

  it('refuses to finish unlocking when a persisted wallet has no keys', async () => {
    vault.lock();
    __resetSealedForTests();
    const {store} = require('redux/store');
    const {
      unlockWithPassword,
      __resetUnlockFlowForTests,
    } = require('security/unlockFlow');
    const {
      setWallets,
    } = require('dok-wallet-blockchain-networks/redux/wallets/walletsSlice');
    // Vault holds nothing for w2.
    await vault.unlockWithPassword('pw');
    const stateKey = await vault.getStateKey();
    const {writeSealed} = require('redux/storage/sealedStorage');
    await writeSealed(
      'persist:wallets',
      buildPersistEnvelope({
        allWallets: [
          strippedWallet,
          {clientId: 'w2', walletName: 'Ghost', coins: []},
        ],
      }),
      stateKey,
    );
    vault.lock();
    __resetSealedForTests();
    __resetUnlockFlowForTests();
    store.dispatch(setWallets([]));
    await expect(
      store.dispatch(unlockWithPassword('pw')),
    ).rejects.toMatchObject({
      code: 'missing_secrets',
      clientIds: ['w2'],
    });
    // Nothing half-open is left behind: no keys in the store, the sealed
    // adapter closed again, the vault locked. The rehydrated (secret-free)
    // wallets themselves stay so the lock screen can still render them.
    expect(isSealedWritable()).toBe(false);
    expect(isSealedReadable()).toBe(false);
    expect(vault.isUnlocked()).toBe(false);
    expect(store.getState().auth.isVaultUnlocked).toBe(false);
    const after = store.getState().wallets.allWallets;
    expect(after.map(w => w.clientId)).toEqual(['w1', 'w2']);
    expect(after.some(w => w.phrase || w.coins?.some(c => c.privateKey))).toBe(
      false,
    );
  });

  it('lockSession zeroises secrets in memory, seals persistence, and re-login restores', async () => {
    vault.lock();
    __resetSealedForTests();
    const {store} = require('redux/store');
    const {
      unlockWithPassword,
      lockSession,
      __resetUnlockFlowForTests,
    } = require('security/unlockFlow');
    const {
      setWallets,
    } = require('dok-wallet-blockchain-networks/redux/wallets/walletsSlice');
    __resetUnlockFlowForTests();
    // Reset the sealed slice back to a single keyed wallet.
    await vault.unlockWithPassword('pw');
    await vault.saveSecrets({
      v: 1,
      wallets: {
        w1: {
          phrase: MNEMONIC,
          coins: {ethereum_ETH: {privateKey: HEX(1)}},
          chainExisting: {},
          deriveKeys: {},
        },
      },
    });
    const stateKey = await vault.getStateKey();
    const {writeSealed} = require('redux/storage/sealedStorage');
    await writeSealed(
      'persist:wallets',
      buildPersistEnvelope({allWallets: [strippedWallet]}),
      stateKey,
    );
    vault.lock();
    __resetSealedForTests();
    __resetUnlockFlowForTests();
    store.dispatch(setWallets([]));
    await store.dispatch(unlockWithPassword('pw'));
    expect(store.getState().wallets.allWallets[0].phrase).toBe(MNEMONIC);

    await store.dispatch(lockSession());
    expect(vault.isUnlocked()).toBe(false);
    expect(isSealedReadable()).toBe(false);
    expect(isSealedWritable()).toBe(false);
    expect(store.getState().auth.isVaultUnlocked).toBe(false);
    const locked = store.getState().wallets.allWallets[0];
    expect(locked.walletName).toBe('Main');
    expect(locked.phrase).toBeUndefined();
    expect(locked.coins[0].privateKey).toBeUndefined();

    await store.dispatch(unlockWithPassword('pw'));
    const restored = store.getState().wallets.allWallets[0];
    expect(restored.phrase).toBe(MNEMONIC);
    expect(restored.coins[0].privateKey).toBe(HEX(1));
    expect(isSealedWritable()).toBe(true);
  });

  it('createAccount seals orphaned legacy wallets and only then marks the migration done', async () => {
    // Fresh profile holding a legacy blob with wallets but no password: the
    // bootstrap can only park the sealed slices in memory.
    vault.lock();
    __resetSealedForTests();
    resetBootstrap();
    consumeOrphanLegacyState();
    await stateDatabase.close();
    await secureStore.close();
    global.indexedDB = new IDBFactory();
    localStorage.setItem(
      LEGACY_ROOT_KEY,
      legacyRoot({
        auth: {isLogin: false, password: ''},
        wallets: {
          allWallets: [wallet],
          currentWalletIndex: 0,
          masterClientId: 'master',
        },
        settings: {theme: 'dark'},
      }),
    );
    await bootstrapStorage();
    expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBeNull();

    const {store} = require('redux/store');
    const {
      createAccount,
      __resetUnlockFlowForTests,
    } = require('security/unlockFlow');
    __resetUnlockFlowForTests();
    await store.dispatch(createAccount('newpw'));

    const live = store.getState().wallets;
    expect(live.allWallets[0].walletName).toBe('Main');
    expect(live.allWallets[0].phrase).toBe(MNEMONIC);
    const stateKey = await vault.getStateKey();
    expect(await readSealed('persist:wallets', stateKey)).toContain('Main');
    expect((await vault.readSecrets()).wallets.w1.phrase).toBe(MNEMONIC);
    expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBe(
      SCHEMA_VERSION.migrated,
    );
    expect(consumeOrphanLegacyState()).toBeNull();
  });

  it('createAccount refuses to replace the vault while an account exists', async () => {
    // Continues from the previous test: a vault with w1's keys, and the
    // account is now registered.
    const {store} = require('redux/store');
    const {createAccount} = require('security/unlockFlow');
    const {
      signUpSuccess,
    } = require('dok-wallet-blockchain-networks/redux/auth/authSlice');
    store.dispatch(signUpSuccess());
    await expect(
      store.dispatch(createAccount('someone-else')),
    ).rejects.toMatchObject({code: 'account_exists'});
    // Untouched: same vault, same keys.
    expect(await vault.hasVault()).toBe(true);
    expect((await vault.readSecrets()).wallets.w1.phrase).toBe(MNEMONIC);
  });
});
