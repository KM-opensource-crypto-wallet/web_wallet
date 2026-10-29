// Web `security/secureStore` adapter on IndexedDB.
//
// The shared vault imports this by alias; the mobile app supplies a
// react-native-sensitive-info file with the same exports. Contract:
//   capabilities.biometric              -> false (no hardware-bound store on the web)
//   get(key, options?)                   -> Promise<string | null>
//   set(key, value, options?)            -> Promise<void>
//   remove(key)                          -> Promise<void>
//   has(key)                             -> Promise<boolean>
//
// There is no hardware key store in a browser. The items kept here (wrapped
// DEK, encrypted blob) are protected by the password-derived key alone; that
// is the threat model the spec records for web. An `accessControl` other than
// 'none' is refused so no caller can believe it got a biometric-bound item.
import {
  SECURE_STORE_ERROR_CODES,
  SecureStoreError,
} from 'dok-wallet-blockchain-networks/security/errors';
import {openKvDatabase} from 'redux/storage/idb';

export const SECURE_DB_NAME = 'dok-secure';
export const SECURE_STORE_NAME = 'kv';

export const capabilities = Object.freeze({biometric: false});
export const isBiometricAvailable = async () => false;

const database = openKvDatabase(SECURE_DB_NAME, [SECURE_STORE_NAME]);
const kv = database.store(SECURE_STORE_NAME);

const assertUnprotected = options => {
  if (options?.accessControl && options.accessControl !== 'none') {
    throw new SecureStoreError(
      SECURE_STORE_ERROR_CODES.UNAVAILABLE,
      `Access control "${options.accessControl}" is not available on the web`,
    );
  }
};

const translate = error =>
  error instanceof SecureStoreError
    ? error
    : new SecureStoreError(
        SECURE_STORE_ERROR_CODES.UNKNOWN,
        error?.message,
        error,
      );

export const get = async (key, options) => {
  assertUnprotected(options);
  try {
    const value = await kv.get(key);
    return typeof value === 'string' ? value : null;
  } catch (error) {
    throw translate(error);
  }
};

export const set = async (key, value, options) => {
  assertUnprotected(options);
  try {
    await kv.set(key, value);
  } catch (error) {
    throw translate(error);
  }
};

export const remove = async key => {
  try {
    await kv.remove(key);
  } catch (error) {
    throw translate(error);
  }
};

export const has = async key => {
  try {
    return await kv.has(key);
  } catch (error) {
    throw translate(error);
  }
};

// For wipeAllLocalData: close the connection so deleteDatabase is not blocked.
export const close = () => database.close();
