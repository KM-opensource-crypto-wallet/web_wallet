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
import {captureError, logger} from 'services/logger';
import {
  SCHEMA_VERSION,
  STORAGE_KEYS,
  bootstrapStorage,
  getSchemaVersion,
  isStorageReady,
  resetBootstrap,
  setSchemaVersion,
} from 'redux/storage/bootstrap';
import {
  __resetBlockedWritesForTests,
  blockWrites,
  plainStorage,
  releaseBlockedWrites,
} from 'redux/storage/plainStorage';
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
    __resetBlockedWritesForTests();
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

    it('reports a vault without an account and never touches the vault', async () => {
      await vault.createVault('pw');
      vault.lock();
      captureError.mockClear();
      await bootstrapStorage();
      expect(await vault.hasVault()).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        'storage.vault_without_account',
        expect.anything(),
      );
      expect(captureError).toHaveBeenCalledWith(
        expect.objectContaining({message: 'Vault found without an account'}),
        expect.anything(),
      );
    });

    it('logs every load with whether an account is stored', async () => {
      await bootstrapStorage();
      await plainKv.set('persist:auth', JSON.stringify({hasAccount: 'true'}));
      await vault.createVault('pw');
      captureError.mockClear();
      resetBootstrap();
      await bootstrapStorage();
      expect(logger.info).toHaveBeenLastCalledWith(
        'storage.bootstrapped',
        expect.objectContaining({hasAccount: true}),
      );
      expect(captureError).not.toHaveBeenCalled();
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

    it('a key whose stored copy failed to load is never overwritten', async () => {
      await plainStorage.setItem('persist:settings', '{"kept":"1"}');
      blockWrites('persist:settings');
      // Refused, and reported as refused (not as written).
      await expect(
        plainStorage.setItem('persist:settings', '{"empty":"1"}'),
      ).rejects.toThrow('blocked');
      expect(await plainStorage.getItem('persist:settings')).toBe(
        '{"kept":"1"}',
      );
    });

    it('releasing a block writes the newest refused value and lifts it', async () => {
      await plainStorage.setItem('persist:auth', '{"kept":"1"}');
      blockWrites('persist:auth');
      await plainStorage.setItem('persist:auth', '{"r":"1"}').catch(() => {});
      await plainStorage.setItem('persist:auth', '{"r":"2"}').catch(() => {});
      await releaseBlockedWrites('persist:auth');
      expect(await plainStorage.getItem('persist:auth')).toBe('{"r":"2"}');
      await plainStorage.setItem('persist:auth', '{"r":"3"}');
      expect(await plainStorage.getItem('persist:auth')).toBe('{"r":"3"}');
    });

    it('a write refused while a release awaits bootstrap is the one written', async () => {
      await plainStorage.setItem('persist:auth', '{"kept":"1"}');
      blockWrites('persist:auth');
      await plainStorage.setItem('persist:auth', '{"r":"1"}').catch(() => {});
      const release = releaseBlockedWrites('persist:auth');
      // Still blocked: the release has not resumed from its await yet.
      await expect(
        plainStorage.setItem('persist:auth', '{"r":"2"}'),
      ).rejects.toThrow('blocked');
      await release;
      expect(await plainStorage.getItem('persist:auth')).toBe('{"r":"2"}');
    });

    it('a failed release keeps the key blocked and the refused value queued', async () => {
      await plainStorage.setItem('persist:auth', '{"kept":"1"}');
      blockWrites('persist:auth');
      await plainStorage.setItem('persist:auth', '{"r":"1"}').catch(() => {});
      const spy = jest
        .spyOn(plainKv, 'set')
        .mockRejectedValueOnce(new Error('idb write failed'));
      await expect(releaseBlockedWrites('persist:auth')).rejects.toThrow(
        'idb write failed',
      );
      spy.mockRestore();
      // Still blocked, stored copy untouched; a retry writes the queued value.
      await expect(
        plainStorage.setItem('persist:auth', '{"r":"2"}'),
      ).rejects.toThrow('blocked');
      expect(await plainStorage.getItem('persist:auth')).toBe('{"kept":"1"}');
      await releaseBlockedWrites('persist:auth');
      expect(await plainStorage.getItem('persist:auth')).toBe('{"r":"2"}');
    });

    it('a value refused while the release writes is written before the block lifts', async () => {
      await plainStorage.setItem('persist:auth', '{"kept":"1"}');
      blockWrites('persist:auth');
      await plainStorage.setItem('persist:auth', '{"r":"1"}').catch(() => {});
      const realSet = plainKv.set.bind(plainKv);
      const spy = jest
        .spyOn(plainKv, 'set')
        .mockImplementationOnce(async (key, value) => {
          // Refused: the release is still writing, so the key stays blocked.
          await expect(
            plainStorage.setItem('persist:auth', '{"r":"2"}'),
          ).rejects.toThrow('blocked');
          return realSet(key, value);
        });
      await releaseBlockedWrites('persist:auth');
      spy.mockRestore();
      expect(await plainStorage.getItem('persist:auth')).toBe('{"r":"2"}');
      await plainStorage.setItem('persist:auth', '{"r":"3"}');
      expect(await plainStorage.getItem('persist:auth')).toBe('{"r":"3"}');
    });

    it('releasing a block with nothing refused keeps the stored copy', async () => {
      await plainStorage.setItem('persist:auth', '{"kept":"1"}');
      blockWrites('persist:auth');
      await releaseBlockedWrites('persist:auth');
      expect(await plainStorage.getItem('persist:auth')).toBe('{"kept":"1"}');
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

    it('a seal that lands mid-call does not turn an in-flight read or write into a null-key call', async () => {
      const key = await deriveStateKey(generateDek());
      unsealStorage(key);
      enableSealedWrites();
      // Both calls capture the key synchronously, then await the bootstrap.
      const write = sealedStorage.setItem('persist:wallets', slice);
      const read = sealedStorage.getItem('persist:wallets');
      sealStorage();
      await expect(write).resolves.toBeUndefined();
      // Resolves (null or the slice, whichever landed first); never rejects.
      await expect(read).resolves.not.toBeUndefined();
      // The write went through under the captured key.
      unsealStorage(key);
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

  describe('deleteDatabase', () => {
    const {deleteDatabase} = require('redux/storage/idb');
    const {STATE_DB_NAME} = require('redux/storage/stateDb');
    // A raw handle with no versionchange handler, like a tab that never lets go.
    const holdOpen = () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(STATE_DB_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

    it('a delete blocked by another connection is reported, not mistaken for success', async () => {
      await bootstrapStorage();
      await stateDatabase.close();
      const holder = await holdOpen();
      try {
        await expect(
          deleteDatabase(STATE_DB_NAME, {blockedTimeoutMs: 50}),
        ).rejects.toMatchObject({code: 'unavailable'});
      } finally {
        holder.close();
      }
    });

    it('a blocked delete that is released in time still resolves', async () => {
      await bootstrapStorage();
      await stateDatabase.close();
      const holder = await holdOpen();
      const pending = deleteDatabase(STATE_DB_NAME, {blockedTimeoutMs: 1000});
      setTimeout(() => holder.close(), 20);
      await expect(pending).resolves.toBeUndefined();
    });
  });

  describe('wipeAllLocalData', () => {
    it('counts a blocked database delete as a failure and still finishes the other steps', async () => {
      await bootstrapStorage();
      localStorage.setItem(LEGACY_ROOT_KEY, 'legacy');
      const {STATE_DB_NAME} = require('redux/storage/stateDb');
      const holder = await new Promise((resolve, reject) => {
        const req = indexedDB.open(STATE_DB_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const persistor = {purge: jest.fn(async () => {})};
      try {
        await expect(wipeAllLocalData({persistor})).rejects.toMatchObject({
          code: 'unavailable',
        });
        const {captureError} = require('services/logger');
        expect(captureError).toHaveBeenCalledWith(
          expect.objectContaining({code: 'unavailable'}),
          expect.objectContaining({
            tags: expect.objectContaining({op: 'wipe', step: 'stateDb'}),
          }),
        );
        // The steps after the blocked delete still ran.
        expect(localStorage.getItem(LEGACY_ROOT_KEY)).toBeNull();
      } finally {
        holder.close();
      }
    }, 10000);

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
