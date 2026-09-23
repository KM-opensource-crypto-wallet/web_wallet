// Minimal promise-based key/value layer over IndexedDB. No dependency: the
// surface the storage adapters and the secure store need is six calls.
//
// Why IndexedDB and not localStorage: it is asynchronous (no main-thread
// block on large writes — that is the web half of the persist freeze), it has
// no 5 MB quota, and it stores binary values. Unavailable in some private
// windows; callers get SecureStoreError(unavailable) and must show a blocking
// error rather than fall through to an empty store.
import {
  SECURE_STORE_ERROR_CODES,
  SecureStoreError,
} from 'dok-wallet-blockchain-networks/security/errors';

export const isIndexedDbAvailable = () =>
  typeof indexedDB !== 'undefined' && indexedDB !== null;

const unavailable = (message, cause) =>
  new SecureStoreError(SECURE_STORE_ERROR_CODES.UNAVAILABLE, message, cause);

const requestToPromise = request =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = tx =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
  });

/**
 * Opens (lazily, once) `dbName` with the given object stores and returns a
 * store-scoped KV API. Multiple stores in one database share one connection.
 */
export const openKvDatabase = (dbName, storeNames) => {
  let dbPromise = null;

  const open = () => {
    if (dbPromise) {
      return dbPromise;
    }
    if (!isIndexedDbAvailable()) {
      return Promise.reject(unavailable('IndexedDB is not available'));
    }
    dbPromise = new Promise((resolve, reject) => {
      let request;
      try {
        request = indexedDB.open(dbName, 1);
      } catch (error) {
        reject(unavailable('IndexedDB open threw', error));
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of storeNames) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name);
          }
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        // Another tab deleted/upgraded the database: drop our handle so the
        // next call reopens instead of failing forever.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        db.onclose = () => {
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () =>
        reject(unavailable('IndexedDB open failed', request.error));
      request.onblocked = () =>
        reject(unavailable('IndexedDB open blocked by another connection'));
    }).catch(error => {
      dbPromise = null;
      throw error;
    });
    return dbPromise;
  };

  const run = async (storeName, mode, fn) => {
    const db = await open();
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = await fn(store);
    await transactionDone(tx);
    return result;
  };

  const store = storeName => ({
    get: key =>
      run(storeName, 'readonly', s => requestToPromise(s.get(key))).then(v =>
        v === undefined ? null : v,
      ),
    set: (key, value) =>
      run(storeName, 'readwrite', s =>
        requestToPromise(s.put(value, key)),
      ).then(() => undefined),
    remove: key =>
      run(storeName, 'readwrite', s => requestToPromise(s.delete(key))).then(
        () => undefined,
      ),
    has: key =>
      run(storeName, 'readonly', s => requestToPromise(s.count(key))).then(
        n => n > 0,
      ),
    keys: () =>
      run(storeName, 'readonly', s => requestToPromise(s.getAllKeys())),
    clear: () =>
      run(storeName, 'readwrite', s => requestToPromise(s.clear())).then(
        () => undefined,
      ),
  });

  const close = async () => {
    if (!dbPromise) {
      return;
    }
    const db = await dbPromise.catch(() => null);
    dbPromise = null;
    db?.close();
  };

  return {name: dbName, open, store, close};
};

// How long a blocked delete may wait for the other connections to close.
// Our own handles close themselves on `versionchange` (see openKvDatabase),
// so in the normal cross-tab case success follows within milliseconds; a tab
// that never lets go is reported instead of being mistaken for a deletion.
export const DELETE_BLOCKED_TIMEOUT_MS = 3000;

export const deleteDatabase = (
  dbName,
  {blockedTimeoutMs = DELETE_BLOCKED_TIMEOUT_MS} = {},
) => {
  if (!isIndexedDbAvailable()) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    let timer = null;
    const settle = fn => value => {
      if (timer) {
        clearTimeout(timer);
      }
      fn(value);
    };
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => settle(resolve)();
    request.onerror = () => settle(reject)(request.error);
    // Another open connection is holding the database. `blocked` is not a
    // deletion: it only says the request is parked until those connections
    // close. Keep waiting for the real success, but never claim it.
    request.onblocked = () => {
      if (!timer) {
        timer = setTimeout(
          () =>
            reject(
              unavailable(
                `IndexedDB delete of "${dbName}" is blocked by another open connection`,
              ),
            ),
          blockedTimeoutMs,
        );
      }
    };
  });
};
