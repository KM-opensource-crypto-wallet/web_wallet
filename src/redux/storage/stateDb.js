// The one IndexedDB database behind the web Tier 1 state store, with two
// object stores:
//   plain  — readable before login: persist:auth (no password), persist:settings,
//            storage.* metadata
//   sealed — AES-256-GCM under the DEK-derived state key: wallets, sellCrypto,
//            batchTransaction, customRpc, sentAddressHistory
// Shared by plainStorage.js and sealedStorage.js so both ride one connection.
import {openKvDatabase} from './idb';

export const STATE_DB_NAME = 'dok-state';
export const PLAIN_STORE = 'plain';
export const SEALED_STORE = 'sealed';

export const stateDatabase = openKvDatabase(STATE_DB_NAME, [
  PLAIN_STORE,
  SEALED_STORE,
]);

export const plainKv = stateDatabase.store(PLAIN_STORE);
export const sealedKv = stateDatabase.store(SEALED_STORE);
