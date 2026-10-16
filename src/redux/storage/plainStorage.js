// redux-persist `Storage` for the slices that must be readable before login
// (`auth` without the password, `settings`). Plain IndexedDB, no encryption:
// the browser has no hardware store to hold a key in, and these slices carry
// nothing privacy-relevant. Every call awaits the storage bootstrap so the
// redux store stays a synchronous export.
import {bootstrapStorage} from './bootstrap';
import {plainKv} from './stateDb';

const isBrowser = () => typeof window !== 'undefined';

// redux-persist starts a slice from its initial state when the stored copy
// cannot be read back (unparseable JSON, a migrate or outbound-transform
// error) and then persists that empty state over the stored one. The store
// blocks writes for such a key (see store.js), so the stored data stays for a
// later load or a fixed version instead of being overwritten.
// The newest value refused per blocked key: a restore that rebuilds the slice
// (vaultRecovery) releases the block and this value replaces the stored one.
// A refused write rejects, so it is never reported as written.
const blockedKeys = new Map();
export const blockWrites = key => {
  if (!blockedKeys.has(key)) {
    blockedKeys.set(key, undefined);
  }
};
export const isWriteBlocked = key => blockedKeys.has(key);

/** Lifts the block on `key` and writes the newest value refused meanwhile. */
export const releaseBlockedWrites = async key => {
  if (!blockedKeys.has(key)) {
    return;
  }
  await bootstrapStorage();
  // Read the queued value only after the await and lift the block in the same
  // synchronous step: a setItem refused while bootstrap was pending queued a
  // newer value, which must be the one written.
  if (!blockedKeys.has(key)) {
    return;
  }
  const value = blockedKeys.get(key);
  blockedKeys.delete(key);
  if (value !== undefined) {
    await plainKv.set(key, value);
  }
};

export const plainStorage = {
  getItem: async key => {
    if (!isBrowser()) {
      return null;
    }
    await bootstrapStorage();
    const value = await plainKv.get(key);
    return typeof value === 'string' ? value : null;
  },
  setItem: async (key, value) => {
    if (!isBrowser()) {
      return;
    }
    if (blockedKeys.has(key)) {
      blockedKeys.set(key, value);
      throw new Error(
        `Writes to "${key}" are blocked: its stored copy failed to load`,
      );
    }
    await bootstrapStorage();
    await plainKv.set(key, value);
  },
  removeItem: async key => {
    if (!isBrowser()) {
      return;
    }
    await bootstrapStorage();
    await plainKv.remove(key);
  },
};

// Test hook only.
export const __resetBlockedWritesForTests = () => {
  blockedKeys.clear();
};
