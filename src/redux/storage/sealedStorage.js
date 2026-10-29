// redux-persist `Storage` for the privacy-relevant slices, sealed with
// AES-256-GCM under the state key that vault.getStateKey() derives from the
// DEK. Nothing here is readable until the user has unlocked.
//
// Lifecycle (spec §3.1):
//   boot      no key: getItem → null, so the slice rehydrates as initial state
//             and PersistGate opens onto the Login screen; setItem → DROPPED,
//             which is what stops redux-persist from writing that initial state
//             over the stored ciphertext.
//   unlock    unsealStorage(stateKey)  → reads work (getStoredState per slice,
//             then persist/REHYDRATE per slice), THEN
//             enableSealedWrites()     → the persistoid may write again.
//             Enabling writes before the rehydrate has landed would let the
//             persistoid overwrite real data with initial state — the same
//             hazard as spec §12.3.4.
//   lock      sealStorage() (Phase 5: zeroise). Until then the key stays so
//             background refreshes keep persisting after an idle lock.
import {
  decryptString,
  encryptString,
} from 'dok-wallet-blockchain-networks/security/vaultCore';
import {addBreadcrumb} from 'services/logger';
import {bootstrapStorage} from './bootstrap';
import {sealedKv} from './stateDb';

let readKey = null;
let writable = false;
let droppedWrites = 0;

const assertKey = key => {
  if (!(key instanceof Uint8Array) || key.byteLength !== 32) {
    throw new TypeError('sealedStorage expects a 32-byte state key');
  }
};

/** Step 1 of unlock: allow reads with this key. Writes stay dropped. */
export const unsealStorage = key => {
  assertKey(key);
  readKey = key;
};

/** Step 2 of unlock, after every sealed slice has been rehydrated. */
export const enableSealedWrites = () => {
  if (!readKey) {
    throw new Error('enableSealedWrites: unsealStorage(key) must run first');
  }
  writable = true;
};

export const sealStorage = () => {
  readKey = null;
  writable = false;
};

export const isSealedReadable = () => readKey !== null;
export const isSealedWritable = () => writable;
export const getDroppedSealedWrites = () => droppedWrites;

// Low-level helpers. They do NOT await bootstrapStorage(): the migrator calls
// them from inside the bootstrap itself (awaiting it there would deadlock).
// The redux-persist adapter below is what waits for the bootstrap.

/** Decrypts one sealed slice with an explicit key (migration, finalise). */
export const readSealed = async (key, withKey) => {
  const envelope = await sealedKv.get(key);
  if (envelope == null) {
    return null;
  }
  return decryptString(withKey, envelope);
};

export const writeSealed = async (key, value, withKey) => {
  await sealedKv.set(key, await encryptString(withKey, value));
};

export const listSealedKeys = () => sealedKv.keys();

const isBrowser = () => typeof window !== 'undefined';

// The key is captured before the await: a sealStorage() that lands while the
// bootstrap promise settles must not turn an in-flight call into a read or
// write with a null key. The captured key is still the right one for whatever
// this call started, and the state key only changes with a new vault.
export const sealedStorage = {
  getItem: async key => {
    const stateKey = readKey;
    if (!stateKey || !isBrowser()) {
      return null;
    }
    await bootstrapStorage();
    return readSealed(key, stateKey);
  },
  setItem: async (key, value) => {
    if (!isBrowser()) {
      return;
    }
    const stateKey = readKey;
    if (!writable || !stateKey) {
      droppedWrites += 1;
      addBreadcrumb('storage', 'sealed.write_dropped', {key}, 'debug');
      return;
    }
    await bootstrapStorage();
    await writeSealed(key, value, stateKey);
  },
  removeItem: async key => {
    if (!isBrowser()) {
      return;
    }
    // Purge/reset is an explicit user action and may run while locked.
    await bootstrapStorage();
    await sealedKv.remove(key);
  },
};

// Test hook only.
export const __resetSealedForTests = () => {
  readKey = null;
  writable = false;
  droppedWrites = 0;
};
