// Opens the web Tier 1 state database exactly once per page load. The
// redux-persist adapters await this, so `store`/`persistor` stay synchronous
// exports and StateProvider does not change.
//
// Order: availability check → open → install sentinel → persist:root
// (localStorage) migration when schemaVersion is 0. A migration failure is
// fatal: the promise stays rejected (no retry loop through the slice reads)
// and StateProvider shows the storage error screen. Only an `unavailable`
// IndexedDB clears the memo so a later call can retry.
import {
  SECURE_STORE_ERROR_CODES,
  SecureStoreError,
} from 'dok-wallet-blockchain-networks/security/errors';
import {addBreadcrumb} from 'services/logger';
import {isIndexedDbAvailable} from './idb';
import {plainKv, stateDatabase} from './stateDb';

export const STORAGE_KEYS = Object.freeze({
  installId: 'storage.installId',
  schemaVersion: 'storage.schemaVersion',
  migratedAt: 'storage.migratedAt',
  legacyRetainedAt: 'storage.legacyRetainedAt',
});

export const SCHEMA_VERSION = Object.freeze({
  legacy: 0, // only localStorage persist:root exists
  migrated: 2, // IndexedDB slices + vault written, legacy retained
  finalized: 3, // legacy deleted after the first successful unlock
});

let bootstrapPromise = null;
let ready = false;

const randomId = () => {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

const run = async () => {
  const startedAt = Date.now();
  if (typeof window === 'undefined') {
    throw new SecureStoreError(
      SECURE_STORE_ERROR_CODES.UNAVAILABLE,
      'Storage bootstrap must run in the browser',
    );
  }
  if (!isIndexedDbAvailable()) {
    throw new SecureStoreError(
      SECURE_STORE_ERROR_CODES.UNAVAILABLE,
      'IndexedDB is not available (private window or blocked site data)',
    );
  }
  await stateDatabase.open();
  if (!(await plainKv.has(STORAGE_KEYS.installId))) {
    await plainKv.set(STORAGE_KEYS.installId, randomId());
  }
  let schemaVersion =
    (await plainKv.get(STORAGE_KEYS.schemaVersion)) ?? SCHEMA_VERSION.legacy;
  if (schemaVersion === SCHEMA_VERSION.legacy) {
    // Required lazily: the migrator imports the vault and the sealed adapter.
    const {hasLegacyRoot, migrateLegacyRoot} = require('./migrateLegacyRoot');
    if (hasLegacyRoot()) {
      await migrateLegacyRoot();
    } else {
      // Fresh profile (or a lost marker): nothing to migrate or finalise, and
      // marking it keeps a stray legacy blob from ever overwriting live data.
      await plainKv.set(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION.finalized);
    }
    schemaVersion =
      (await plainKv.get(STORAGE_KEYS.schemaVersion)) ?? SCHEMA_VERSION.legacy;
  }
  ready = true;
  addBreadcrumb(
    'storage',
    'storage.bootstrapped',
    {ms: Date.now() - startedAt, schemaVersion},
    'debug',
  );
  return {schemaVersion};
};

/** Memoised. `unavailable` clears the memo; other failures stay rejected until resetBootstrap(). */
export const bootstrapStorage = () => {
  if (!bootstrapPromise) {
    bootstrapPromise = run().catch(error => {
      ready = false;
      if (error?.code === SECURE_STORE_ERROR_CODES.UNAVAILABLE) {
        bootstrapPromise = null;
      }
      throw error;
    });
  }
  return bootstrapPromise;
};

export const isStorageReady = () => ready;

export const getSchemaVersion = async () => {
  await bootstrapStorage();
  return (
    (await plainKv.get(STORAGE_KEYS.schemaVersion)) ?? SCHEMA_VERSION.legacy
  );
};

export const setSchemaVersion = async version => {
  await bootstrapStorage();
  await plainKv.set(STORAGE_KEYS.schemaVersion, version);
};

/** Used by wipeAllLocalData so the next bootstrap starts from nothing. */
export const resetBootstrap = () => {
  bootstrapPromise = null;
  ready = false;
};
