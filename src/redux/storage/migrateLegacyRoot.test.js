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
  commitOrphanLegacyMigration,
  consumeOrphanLegacyState,
  decodeLegacyValue,
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

// Exactly what redux-persist-transform-encrypt + createPersistoid wrote:
// the encrypt transform returns a ciphertext string and the persistoid
// serialises every transformed field (`stagedState[key] = serialize(endState)`)
// before serialising the root, so each field is a JSON string literal *of* the
// ciphertext ("\"U2FsdGVkX1...\""), including `_persist`.
const encryptField = value =>
  JSON.stringify(Aes.encrypt(JSON.stringify(value), SECRET_KEY).toString());
const legacyRoot = slices =>
  JSON.stringify({
    ...Object.fromEntries(
      Object.entries(slices).map(([k, v]) => [k, encryptField(v)]),
    ),
    _persist: encryptField({version: -1, rehydrated: true}),
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

  describe('decodeLegacyValue mirrors getStoredState: deserialise the field, then decrypt', () => {
    it('returns the plaintext JSON of a persistoid-serialised ciphertext', () => {
      const field = encryptField({password: 'pw', loading: false});
      expect(JSON.parse(field)).toMatch(/^U2FsdGVkX1/); // quoted ciphertext
      expect(JSON.parse(decodeLegacyValue('auth', field))).toEqual({
        password: 'pw',
        loading: false,
      });
    });

    it('rejects a field that is not a ciphertext string with the parse code', () => {
      expect(() => decodeLegacyValue('auth', '{"password":"pw"}')).toThrow(
        expect.objectContaining({code: MIGRATION_ERROR_CODES.PARSE}),
      );
      expect(() => decodeLegacyValue('auth', 'not json')).toThrow(
        expect.objectContaining({code: MIGRATION_ERROR_CODES.PARSE}),
      );
    });
  });

  it('corrupt outer JSON is fatal with the parse code', async () => {
    localStorage.setItem(LEGACY_ROOT_KEY, '{not json');
    await expect(bootstrapStorage()).rejects.toMatchObject({
      code: MIGRATION_ERROR_CODES.PARSE,
    });
  });

  it('no password: plain slices written, sealed slices kept in memory as orphan state, schema stays 0', async () => {
    seedLegacy(legacySlices({password: ''}));
    await bootstrapStorage();
    // Nothing sealed is on disk yet, so the migration must not be marked done.
    expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBeNull();
    expect(
      parsePersistEnvelope(await plainKv.get('persist:auth')).hasAccount,
    ).toBe(false);
    expect(await vault.hasVault()).toBe(false);
    expect(await listSealedKeys()).toEqual([]);
    // Finalisation never runs over pending orphan state.
    expect(
      await finalizeLegacyMigration({
        getState: () => ({wallets: {allWallets: []}}),
      }),
    ).toBe(false);
    expect(localStorage.getItem(LEGACY_ROOT_KEY)).not.toBeNull();

    // A reload before Registration redoes the migration from the blob instead
    // of skipping it (which would drop the wallets held only in memory).
    consumeOrphanLegacyState();
    resetBootstrap();
    await bootstrapStorage();
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

    // createAccount's last step, after the sealed flush: now it is migrated.
    expect(await commitOrphanLegacyMigration()).toBe(true);
    expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBe(
      SCHEMA_VERSION.migrated,
    );
    expect(await commitOrphanLegacyMigration()).toBe(false);
    resetBootstrap();
    await bootstrapStorage();
    expect(consumeOrphanLegacyState()).toBeNull();
  });

  it('fresh profile with no legacy blob goes straight to schema 3', async () => {
    await bootstrapStorage();
    expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBe(
      SCHEMA_VERSION.finalized,
    );
  });

  describe('legacy blob read failures are never mistaken for "no legacy blob"', () => {
    // localStorage.getItem throws (SecurityError) when site data is blocked.
    // runMigrations must not read that as "fresh install" and stamp schema 3
    // over an un-migrated blob: the bootstrap rejects, nothing is marked, and
    // the next bootstrapStorage() after resetBootstrap() redoes it for real.
    const failLegacyRead = () => {
      const real = localStorage.getItem;
      localStorage.getItem = key => {
        if (key === LEGACY_ROOT_KEY) {
          throw Object.assign(new Error('storage blocked'), {
            name: 'SecurityError',
          });
        }
        return real(key);
      };
      return () => {
        localStorage.getItem = real;
      };
    };

    it('a throwing legacy read rejects the bootstrap and never marks the schema', async () => {
      const slices = legacySlices();
      seedLegacy(slices);
      const restore = failLegacyRead();
      try {
        await expect(bootstrapStorage()).rejects.toThrow('storage blocked');
        expect(isStorageReady()).toBe(false);
        expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBeNull();
        expect(await vault.hasVault()).toBe(false);
      } finally {
        restore();
      }
      expect(localStorage.getItem(LEGACY_ROOT_KEY)).not.toBeNull();

      // Retry runs the real migration from the untouched blob.
      resetBootstrap();
      await bootstrapStorage();
      expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBe(
        SCHEMA_VERSION.migrated,
      );
      expect(await vault.unlockWithPassword('Secret123!')).toEqual(
        extractVaultPayload(slices.wallets.allWallets),
      );
    });

    it('a throwing read with no blob is still fatal, not a fresh install', async () => {
      const restore = failLegacyRead();
      try {
        await expect(bootstrapStorage()).rejects.toThrow('storage blocked');
        expect(await plainKv.get(STORAGE_KEYS.schemaVersion)).toBeNull();
      } finally {
        restore();
      }
    });
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
