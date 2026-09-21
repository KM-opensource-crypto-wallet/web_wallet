/**
 * Web Tier 1 storage: IndexedDB plain/sealed adapters, bootstrap, wipe.
 * fake-indexeddb stands in for the browser's IndexedDB under Node.
 */
import 'fake-indexeddb/auto';
import {IDBFactory} from 'fake-indexeddb';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {
  deriveStateKey,
  generateDek,
} from 'dok-wallet-blockchain-networks/security/vaultCore';
import * as secureStore from 'security/secureStore';
import {
  SCHEMA_VERSION,
  STORAGE_KEYS,
  bootstrapStorage,
  getSchemaVersion,
  isStorageReady,
  resetBootstrap,
  setSchemaVersion,
} from 'redux/storage/bootstrap';
import {plainStorage} from 'redux/storage/plainStorage';
import {
  __resetSealedForTests,
  enableSealedWrites,
  getDroppedSealedWrites,
  isSealedReadable,
  isSealedWritable,
  listSealedKeys,
  readSealed,
  sealStorage,
  sealedStorage,
  unsealStorage,
} from 'redux/storage/sealedStorage';
import {plainKv, sealedKv, stateDatabase} from 'redux/storage/stateDb';
import {LEGACY_ROOT_KEY, wipeAllLocalData} from 'redux/storage/wipe';

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

// jsdom is not in play (testEnvironment: node); give bootstrap a `window`.
global.window = global.window || {};
global.localStorage = global.localStorage || {
  store: {},
  removeItem(key) {
    delete this.store[key];
  },
  setItem(key, value) {
    this.store[key] = value;
  },
  getItem(key) {
    return this.store[key] ?? null;
  },
};

const freshIndexedDb = () => {
  // A brand-new factory = an empty browser profile.
  global.indexedDB = new IDBFactory();
};

describe('web storage', () => {
  beforeEach(async () => {
    await stateDatabase.close();
    await secureStore.close();
    freshIndexedDb();
    resetBootstrap();
    __resetSealedForTests();
    vault.__resetForTests();
  });

  describe('bootstrap', () => {
    it('opens the database, writes an install sentinel and marks a fresh profile finalized', async () => {
      expect(isStorageReady()).toBe(false);
      const result = await bootstrapStorage();
      // No legacy blob: nothing to migrate, marker goes straight to 3.
      expect(result).toEqual({schemaVersion: SCHEMA_VERSION.finalized});
      expect(isStorageReady()).toBe(true);
      expect(await plainKv.get(STORAGE_KEYS.installId)).toMatch(
        /^[0-9a-f]{24}$/,
      );
    });

    it('is memoised and keeps the sentinel across reloads', async () => {
      await bootstrapStorage();
      const id = await plainKv.get(STORAGE_KEYS.installId);
      expect(await bootstrapStorage()).toBe(await bootstrapStorage());
      resetBootstrap();
      await bootstrapStorage();
      expect(await plainKv.get(STORAGE_KEYS.installId)).toBe(id);
    });

    it('schema version round-trips', async () => {
      await setSchemaVersion(SCHEMA_VERSION.migrated);
      expect(await getSchemaVersion()).toBe(2);
    });

    it('rejects with a coded error when IndexedDB is missing, and retries later', async () => {
      const saved = global.indexedDB;
      global.indexedDB = undefined;
      await expect(bootstrapStorage()).rejects.toMatchObject({
        name: 'SecureStoreError',
        code: 'unavailable',
      });
      expect(isStorageReady()).toBe(false);
      global.indexedDB = saved;
      await expect(bootstrapStorage()).resolves.toBeDefined();
    });
  });

  describe('plainStorage', () => {
    it('round-trips strings and returns null for missing keys', async () => {
      expect(await plainStorage.getItem('persist:auth')).toBeNull();
      await plainStorage.setItem('persist:auth', '{"hasAccount":"true"}');
      expect(await plainStorage.getItem('persist:auth')).toBe(
        '{"hasAccount":"true"}',
      );
      await plainStorage.removeItem('persist:auth');
      expect(await plainStorage.getItem('persist:auth')).toBeNull();
    });
  });

  describe('sealedStorage', () => {
    const slice = JSON.stringify({
      allWallets: '[{"clientId":"w1"}]',
      _persist: '{}',
    });

    it('reads null and drops writes while locked', async () => {
      expect(isSealedWritable()).toBe(false);
      expect(await sealedStorage.getItem('persist:wallets')).toBeNull();
      await sealedStorage.setItem('persist:wallets', slice);
      expect(getDroppedSealedWrites()).toBe(1);
      expect(await listSealedKeys()).toEqual([]);
    });

    it('seals under the state key once writes are enabled; ciphertext never holds plaintext', async () => {
      const key = await deriveStateKey(generateDek());
      unsealStorage(key);
      enableSealedWrites();
      await sealedStorage.setItem('persist:wallets', slice);
      const stored = await sealedKv.get('persist:wallets');
      expect(stored).toMatchObject({
        v: 1,
        cipher: 'aes-256-gcm',
        aad: 'dok.state.v1',
      });
      expect(JSON.stringify(stored)).not.toContain('clientId');
      expect(await sealedStorage.getItem('persist:wallets')).toBe(slice);
      expect(await readSealed('persist:wallets', key)).toBe(slice);
      expect(await listSealedKeys()).toEqual(['persist:wallets']);
    });

    it('the unlock ordering: data written before lock survives dropped writes and is readable with the key', async () => {
      const key = await deriveStateKey(generateDek());
      unsealStorage(key);
      enableSealedWrites();
      await sealedStorage.setItem('persist:wallets', slice);
      // Reload: locked again; redux-persist would now try to persist initial state.
      sealStorage();
      await sealedStorage.setItem(
        'persist:wallets',
        JSON.stringify({allWallets: '[]'}),
      );
      expect(await sealedStorage.getItem('persist:wallets')).toBeNull();
      // After unlock the real data is still there.
      expect(await readSealed('persist:wallets', key)).toBe(slice);
    });

    it("cannot be read with another DEK's state key", async () => {
      const key = await deriveStateKey(generateDek());
      unsealStorage(key);
      enableSealedWrites();
      await sealedStorage.setItem('persist:wallets', slice);
      await expect(
        readSealed('persist:wallets', await deriveStateKey(generateDek())),
      ).rejects.toMatchObject({code: 'corrupt_envelope'});
    });

    it('removeItem works while locked (explicit reset)', async () => {
      const key = await deriveStateKey(generateDek());
      unsealStorage(key);
      enableSealedWrites();
      await sealedStorage.setItem('persist:wallets', slice);
      sealStorage();
      await sealedStorage.removeItem('persist:wallets');
      expect(await listSealedKeys()).toEqual([]);
    });

    it('rejects a wrong key shape and writes before unseal', () => {
      expect(() => unsealStorage('not bytes')).toThrow(TypeError);
      expect(() => unsealStorage(new Uint8Array(16))).toThrow(TypeError);
      expect(() => enableSealedWrites()).toThrow(/unsealStorage/);
    });

    it('unseal-only: reads work (rehydrate window) while writes are still dropped', async () => {
      const key = await deriveStateKey(generateDek());
      unsealStorage(key);
      enableSealedWrites();
      await sealedStorage.setItem('persist:wallets', slice);
      sealStorage();

      unsealStorage(key);
      expect(isSealedReadable()).toBe(true);
      expect(isSealedWritable()).toBe(false);
      expect(await sealedStorage.getItem('persist:wallets')).toBe(slice);
      const dropped = getDroppedSealedWrites();
      await sealedStorage.setItem('persist:wallets', 'initial-state');
      expect(getDroppedSealedWrites()).toBe(dropped + 1);
      expect(await sealedStorage.getItem('persist:wallets')).toBe(slice);
    });
  });

  describe('secureStore (IndexedDB adapter)', () => {
    it('reports no biometric capability and refuses protected items', async () => {
      expect(secureStore.capabilities.biometric).toBe(false);
      await expect(
        secureStore.set('k', 'v', {accessControl: 'biometryCurrentSet'}),
      ).rejects.toMatchObject({code: 'unavailable'});
    });

    it('round-trips', async () => {
      expect(await secureStore.get('k')).toBeNull();
      await secureStore.set('k', 'v');
      expect(await secureStore.get('k')).toBe('v');
      expect(await secureStore.has('k')).toBe(true);
      await secureStore.remove('k');
      expect(await secureStore.has('k')).toBe(false);
    });
  });

  describe('wipeAllLocalData', () => {
    it('removes vault, both databases, the legacy blob and the WalletConnect cache', async () => {
      await bootstrapStorage();
      await vault.createVault('pw');
      unsealStorage(await vault.getStateKey());
      enableSealedWrites();
      await sealedStorage.setItem('persist:wallets', '{}');
      await plainStorage.setItem('persist:auth', '{}');
      localStorage.setItem(LEGACY_ROOT_KEY, 'legacy');
      const persistor = {purge: jest.fn(async () => {})};

      await wipeAllLocalData({persistor});

      expect(persistor.purge).toHaveBeenCalled();
      expect(vault.isUnlocked()).toBe(false);
      expect(isSealedWritable()).toBe(false);
      expect(isStorageReady()).toBe(false);
      expect(localStorage.getItem(LEGACY_ROOT_KEY)).toBeNull();
      const {
        clearWalletConnectStorageCache,
      } = require('utils/localStorageData');
      expect(clearWalletConnectStorageCache).toHaveBeenCalled();

      // Reopening finds an empty profile.
      await bootstrapStorage();
      expect(await plainStorage.getItem('persist:auth')).toBeNull();
      expect(await listSealedKeys()).toEqual([]);
      expect(await vault.hasVault()).toBe(false);
    });
  });
});
