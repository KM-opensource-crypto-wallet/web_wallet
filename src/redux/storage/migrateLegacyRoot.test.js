/**
 * Legacy web blob (localStorage persist:root, crypto-js AES per slice) →
 * IndexedDB plain/sealed slices + vault.
 */
import 'fake-indexeddb/auto';
import {IDBFactory} from 'fake-indexeddb';
import Aes from 'crypto-js/aes';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {
  assertNoSecrets,
  extractVaultPayload,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletSecrets';
import {parsePersistEnvelope} from 'dok-wallet-blockchain-networks/redux/storage/legacyRootMigration';
import * as secureStore from 'security/secureStore';
import {
  SCHEMA_VERSION,
  STORAGE_KEYS,
  bootstrapStorage,
  isStorageReady,
  resetBootstrap,
} from 'redux/storage/bootstrap';
import {plainKv, stateDatabase} from 'redux/storage/stateDb';
import {
  MIGRATION_ERROR_CODES,
  consumeOrphanLegacyState,
  finalizeLegacyMigration,
} from 'redux/storage/migrateLegacyRoot';
import {
  __resetSealedForTests,
  listSealedKeys,
  readSealed,
} from 'redux/storage/sealedStorage';
import {LEGACY_ROOT_KEY} from 'redux/storage/wipe';

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
// SWC-compiled ES exports are not configurable, so jest.spyOn cannot patch the
// vault namespace; a partial mock with a one-shot failure flag does the job.
jest.mock('dok-wallet-blockchain-networks/security/vault', () => {
  const actual = jest.requireActual(
    'dok-wallet-blockchain-networks/security/vault',
  );
  const control = {failNextSave: false};
  return {
    ...actual,
    __control: control,
    saveSecrets: (...args) => {
      if (control.failNextSave) {
        control.failNextSave = false;
        return Promise.reject(new Error('reload'));
      }
      return actual.saveSecrets(...args);
    },
  };
});
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

const SECRET_KEY = 'test';
process.env.REDUX_WEB_KEY = SECRET_KEY;

global.window = global.window || {};
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

const HEX = i => `0x${String(i).padStart(2, '0').repeat(32)}`;
const MNEMONIC = 'abandon '.repeat(11) + 'about';

const legacySlices = ({password = 'Secret123!'} = {}) => ({
  auth: {isLogin: true, password, loading: false, error: null, attempts: []},
  wallets: {
    allWallets: [
      {
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
              {
                address: '0xa0',
                derivePath: "m/44'/60'/0'/0/0",
                privateKey: HEX(1),
              },
            ],
          },
        ],
        chain_existing_coin: {ethereum: {address: '0xa0', privateKey: HEX(1)}},
      },
    ],
    currentWalletIndex: 0,
    masterClientId: 'master',
  },
  settings: {theme: 'dark', lockTime: 5},
  sellCrypto: {requestDetails: {selectedFromWallet: null}},
  batchTransaction: {transactions: {}},
  customRpc: {rpcs: {}},
  sentAddressHistory: {items: []},
});

// Exactly what redux-persist-transform-encrypt + createPersistoid wrote.
const legacyRoot = slices =>
  JSON.stringify({
    ...Object.fromEntries(
      Object.entries(slices).map(([k, v]) => [
        k,
        Aes.encrypt(JSON.stringify(v), SECRET_KEY).toString(),
      ]),
    ),
    _persist: Aes.encrypt(
      JSON.stringify({version: -1, rehydrated: true}),
      SECRET_KEY,
    ).toString(),
  });

const seedLegacy = slices =>
  localStorage.setItem(LEGACY_ROOT_KEY, legacyRoot(slices));

describe('migrateLegacyRoot (web)', () => {
  beforeEach(async () => {
    await stateDatabase.close();
    await secureStore.close();
    global.indexedDB = new IDBFactory();
    localStorage.clear();
    resetBootstrap();
    __resetSealedForTests();
    vault.__resetForTests();
    consumeOrphanLegacyState();
  });

  it('decrypts the crypto-js blob, seals the wallet slices, builds the vault, keeps legacy, sets 2', async () => {
    const slices = legacySlices();
    seedLegacy(slices);

    await bootstrapStorage();

    expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBe(
      SCHEMA_VERSION.migrated,
    );
    expect(localStorage.getItem(LEGACY_ROOT_KEY)).not.toBeNull();

    const auth = parsePersistEnvelope(await plainKv.get('persist:auth'));
    expect(auth.hasAccount).toBe(true);
    expect(auth.password).toBeUndefined();
    expect(
      parsePersistEnvelope(await plainKv.get('persist:settings')).lockTime,
    ).toBe(5);
    // Sealed slices are not in the plain store and not readable without the key.
    expect(await plainKv.get('persist:wallets')).toBeNull();
    expect((await listSealedKeys()).sort()).toEqual([
      'persist:batchTransaction',
      'persist:customRpc',
      'persist:sellCrypto',
      'persist:sentAddressHistory',
      'persist:wallets',
    ]);

    expect(vault.isUnlocked()).toBe(false);
    const payload = await vault.unlockWithPassword('Secret123!');
    expect(payload).toEqual(extractVaultPayload(slices.wallets.allWallets));
    const stateKey = await vault.getStateKey();
    const wallets = parsePersistEnvelope(
      await readSealed('persist:wallets', stateKey),
    );
    expect(wallets.currentWalletClientId).toBe('w1');
    expect(wallets.allWallets[0].walletName).toBe('Main');
    expect(() => assertNoSecrets(wallets)).not.toThrow();
  });

  it('assigns a clientId to pre-clientId wallets and keeps their secrets reachable', async () => {
    // Wallets from before clientId existed only got one at runtime via
    // createClientIdIfNotExist; the migration must not strip them into limbo.
    const slices = legacySlices();
    slices.wallets.allWallets.push({
      walletName: 'Ancient',
      phrase: MNEMONIC,
      coins: [],
    });
    slices.wallets.currentWalletIndex = 1;
    seedLegacy(slices);

    await bootstrapStorage();
    expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBe(
      SCHEMA_VERSION.migrated,
    );

    const payload = await vault.unlockWithPassword('Secret123!');
    const wallets = parsePersistEnvelope(
      await readSealed('persist:wallets', await vault.getStateKey()),
    );
    const ancient = wallets.allWallets[1];
    expect(ancient.walletName).toBe('Ancient');
    expect(ancient.clientId).toEqual(expect.any(String));
    expect(ancient.phrase).toBeUndefined();
    expect(wallets.currentWalletClientId).toBe(ancient.clientId);
    expect(payload.wallets[ancient.clientId].phrase).toBe(MNEMONIC);
    expect(Object.keys(payload.wallets).sort()).toEqual(
      ['w1', ancient.clientId].sort(),
    );
  });

  it('redoes cleanly after a reload mid-migration', async () => {
    const slices = legacySlices();
    seedLegacy(slices);
    vault.__control.failNextSave = true;
    await expect(bootstrapStorage()).rejects.toThrow('reload');
    expect(isStorageReady()).toBe(false);

    resetBootstrap();
    await bootstrapStorage();
    expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBe(
      SCHEMA_VERSION.migrated,
    );
    expect(await vault.unlockWithPassword('Secret123!')).toEqual(
      extractVaultPayload(slices.wallets.allWallets),
    );
  });

  it('wrong REDUX_WEB_KEY is fatal: nothing written, memoised rejection, legacy untouched', async () => {
    seedLegacy(legacySlices());
    process.env.REDUX_WEB_KEY = 'not-the-key';
    try {
      await expect(bootstrapStorage()).rejects.toMatchObject({
        code: MIGRATION_ERROR_CODES.DECRYPT,
      });
      await expect(bootstrapStorage()).rejects.toMatchObject({
        code: MIGRATION_ERROR_CODES.DECRYPT,
      });
      expect(localStorage.getItem(LEGACY_ROOT_KEY)).not.toBeNull();
      expect(await vault.hasVault()).toBe(false);
    } finally {
      process.env.REDUX_WEB_KEY = SECRET_KEY;
    }
  });

  it('corrupt outer JSON is fatal with the parse code', async () => {
    localStorage.setItem(LEGACY_ROOT_KEY, '{not json');
    await expect(bootstrapStorage()).rejects.toMatchObject({
      code: MIGRATION_ERROR_CODES.PARSE,
    });
  });

  it('no password: plain slices written, sealed slices kept in memory as orphan state', async () => {
    seedLegacy(legacySlices({password: ''}));
    await bootstrapStorage();
    expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBe(
      SCHEMA_VERSION.migrated,
    );
    expect(
      parsePersistEnvelope(await plainKv.get('persist:auth')).hasAccount,
    ).toBe(false);
    expect(await vault.hasVault()).toBe(false);
    expect(await listSealedKeys()).toEqual([]);
    const orphan = consumeOrphanLegacyState();
    expect(Object.keys(orphan.slices).sort()).toEqual([
      'batchTransaction',
      'customRpc',
      'sellCrypto',
      'sentAddressHistory',
      'wallets',
    ]);
    expect(orphan.vaultPayload.wallets.w1.phrase).toBe(MNEMONIC);
    expect(() => assertNoSecrets(orphan.slices)).not.toThrow();
  });

  it('fresh profile with no legacy blob goes straight to schema 3', async () => {
    await bootstrapStorage();
    expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBe(
      SCHEMA_VERSION.finalized,
    );
  });

  describe('finalizeLegacyMigration', () => {
    it('removes the legacy blob and sets 3 once the hydrated wallets match', async () => {
      const slices = legacySlices();
      seedLegacy(slices);
      await bootstrapStorage();
      await vault.unlockWithPassword('Secret123!');
      const getState = () => ({
        wallets: {allWallets: slices.wallets.allWallets},
      });
      expect(await finalizeLegacyMigration({getState})).toBe(true);
      expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBe(
        SCHEMA_VERSION.finalized,
      );
      expect(localStorage.getItem(LEGACY_ROOT_KEY)).toBeNull();
      expect(await finalizeLegacyMigration({getState})).toBe(false);
    });

    it('keeps the legacy blob when the hydrated store does not match or the vault is locked', async () => {
      const slices = legacySlices();
      seedLegacy(slices);
      await bootstrapStorage();
      const getState = () => ({wallets: {allWallets: []}});
      expect(await finalizeLegacyMigration({getState})).toBe(false); // locked
      await vault.unlockWithPassword('Secret123!');
      expect(await finalizeLegacyMigration({getState})).toBe(false); // mismatch
      expect(localStorage.getItem(LEGACY_ROOT_KEY)).not.toBeNull();
    });
  });
});
