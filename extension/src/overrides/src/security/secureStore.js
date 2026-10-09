// Extension `security/secureStore`: the web IndexedDB adapter, plus the
// vault's "biometric" item kept in chrome.storage.session instead.
//
// The shared vault stores a raw copy of the DEK in that item to unlock
// without the password (Face ID / fingerprint on mobile). The extension uses
// the same slot for its unlock session (see src/extension/session.js), so
// capabilities.biometric is true here. Only the extension's unlockFlow calls
// the biometric vault functions; no web UI offers biometrics.
import * as webStore from '@web-original/src/security/secureStore';
import {
  SECURE_STORE_ERROR_CODES,
  SecureStoreError,
} from 'dok-wallet-blockchain-networks/security/errors';
import {
  readSessionDek,
  removeSessionDek,
  writeSessionDek,
} from '@ext/extension/session';

export {
  SECURE_DB_NAME,
  SECURE_STORE_NAME,
  close,
} from '@web-original/src/security/secureStore';

export const capabilities = Object.freeze({biometric: true});
export const isBiometricAvailable = async () => true;

// VAULT_KEYS.dekBiometric in the shared vault (not imported: the vault
// imports this module).
const SESSION_ITEM = 'vault.dek.biometric';
const isSessionItem = key => key === SESSION_ITEM;

const translate = error =>
  error instanceof SecureStoreError
    ? error
    : new SecureStoreError(
        SECURE_STORE_ERROR_CODES.UNKNOWN,
        error?.message,
        error,
      );

const guard = async fn => {
  try {
    return await fn();
  } catch (error) {
    throw translate(error);
  }
};

export const get = (key, options) =>
  isSessionItem(key) ? guard(readSessionDek) : webStore.get(key, options);

export const set = (key, value, options) =>
  isSessionItem(key)
    ? guard(() => writeSessionDek(value))
    : webStore.set(key, value, options);

export const remove = key =>
  isSessionItem(key) ? guard(removeSessionDek) : webStore.remove(key);

export const has = async key =>
  isSessionItem(key) ? (await get(key)) != null : webStore.has(key);
