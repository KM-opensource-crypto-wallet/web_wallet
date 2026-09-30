// "Delete all data" / forgot password. Today reset only dispatches
// resetWallet(), which overwrites `persist:root` on the next write and leaves
// the old ciphertext on disk (defect W4). This removes every local trace.
//
// Order: purge (stop the persistoid writing) → vault items → close connections
// → delete both databases → legacy localStorage blob → WalletConnect cache.
// Each step is independent; errors are collected and the first rethrown.
import * as secureStore from 'security/secureStore';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {addBreadcrumb, captureError} from 'services/logger';
import {clearWalletConnectStorageCache} from 'utils/localStorageData';
import {deleteDatabase} from './idb';
import {resetBootstrap} from './bootstrap';
import {sealStorage} from './sealedStorage';
import {STATE_DB_NAME, stateDatabase} from './stateDb';
import {SECURE_DB_NAME} from 'security/secureStore';

// The pre-vault single blob written by redux-persist (key 'root').
export const LEGACY_ROOT_KEY = 'persist:root';

export const removeLegacyRootBlob = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(LEGACY_ROOT_KEY);
  }
};

export const wipeAllLocalData = async ({persistor} = {}) => {
  const errors = [];
  const attempt = async (step, fn) => {
    try {
      await fn();
    } catch (error) {
      errors.push(error);
      captureError(error, {tags: {area: 'storage', op: 'wipe', step}});
    }
  };

  await attempt('purge', async () => {
    if (persistor) {
      await persistor.purge();
    }
  });
  await attempt('vault', () => vault.destroy());
  sealStorage();
  resetBootstrap();
  await attempt('close', async () => {
    await secureStore.close();
    await stateDatabase.close();
  });
  await attempt('secureDb', () => deleteDatabase(SECURE_DB_NAME));
  await attempt('stateDb', () => deleteDatabase(STATE_DB_NAME));
  await attempt('legacy', removeLegacyRootBlob);
  await attempt('walletconnect', () => clearWalletConnectStorageCache());

  addBreadcrumb('storage', 'storage.wiped', {errors: errors.length}, 'info');
  if (errors.length) {
    throw errors[0];
  }
};
