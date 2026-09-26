// Web `security/vaultCrypto` adapter on the Web Crypto API.
//
// The shared vault core (dok-wallet-blockchain-networks/security/vaultCore.js)
// imports this by alias; the mobile app supplies a react-native-quick-crypto
// file with the same exports. Contract:
//   randomBytes(n)                                  -> Uint8Array
//   pbkdf2(password, salt, iterations, keyLen)       -> Promise<Uint8Array>  (HMAC-SHA256)
//   hkdf(ikm, salt, info, keyLen)                    -> Promise<Uint8Array>  (SHA-256; info: string | bytes)
//   aesGcmEncrypt(key, iv, plaintext, aad)           -> Promise<Uint8Array>  ct || 16-byte tag
//   aesGcmDecrypt(key, iv, ctWithTag, aad)           -> Promise<Uint8Array>  throws VaultCryptoError(auth_failed)
// Byte arguments are Uint8Array; `password`, `aad` and `info` are strings.
//
// PBKDF2 runs in a Web Worker in the browser (src/workers/kdfWorker.js) and on
// the main thread under Node/Jest, where `Worker` does not exist.
import {
  VAULT_CRYPTO_ERROR_CODES,
  VaultCryptoError,
} from 'dok-wallet-blockchain-networks/security/errors';
import {
  toUint8,
  utf8Encode,
} from 'dok-wallet-blockchain-networks/security/bytes';
import {canUseKdfWorker, pbkdf2InWorker} from './kdfWorkerClient';

const getWebCrypto = () => {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle) {
    throw new VaultCryptoError(
      VAULT_CRYPTO_ERROR_CODES.UNAVAILABLE,
      'Web Crypto API is not available in this environment',
    );
  }
  return webCrypto;
};

export const randomBytes = n => {
  const out = new Uint8Array(n);
  getWebCrypto().getRandomValues(out);
  return out;
};

const pbkdf2MainThread = async (password, salt, iterations, keyLen) => {
  const {subtle} = getWebCrypto();
  const keyMaterial = await subtle.importKey(
    'raw',
    utf8Encode(password),
    {name: 'PBKDF2'},
    false,
    ['deriveBits'],
  );
  const bits = await subtle.deriveBits(
    {name: 'PBKDF2', salt: toUint8(salt), iterations, hash: 'SHA-256'},
    keyMaterial,
    keyLen * 8,
  );
  return new Uint8Array(bits);
};

export const pbkdf2 = async (password, salt, iterations, keyLen) => {
  if (canUseKdfWorker()) {
    try {
      return await pbkdf2InWorker(password, salt, iterations, keyLen);
    } catch {
      // Worker chunk failed to load or run: the derivation itself is not at
      // fault, so fall back to the main thread rather than failing the unlock.
    }
  }
  return pbkdf2MainThread(password, salt, iterations, keyLen);
};

export const hkdf = async (ikm, salt, info, keyLen) => {
  const {subtle} = getWebCrypto();
  const keyMaterial = await subtle.importKey(
    'raw',
    toUint8(ikm),
    {name: 'HKDF'},
    false,
    ['deriveBits'],
  );
  const bits = await subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toUint8(salt),
      info: typeof info === 'string' ? utf8Encode(info) : toUint8(info),
    },
    keyMaterial,
    keyLen * 8,
  );
  return new Uint8Array(bits);
};

const importAesKey = (key, usage) =>
  getWebCrypto().subtle.importKey(
    'raw',
    toUint8(key),
    {name: 'AES-GCM'},
    false,
    [usage],
  );

export const aesGcmEncrypt = async (key, iv, plaintext, aad) => {
  const cryptoKey = await importAesKey(key, 'encrypt');
  const ct = await getWebCrypto().subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toUint8(iv),
      additionalData: utf8Encode(aad),
      tagLength: 128,
    },
    cryptoKey,
    toUint8(plaintext),
  );
  return new Uint8Array(ct);
};

export const aesGcmDecrypt = async (key, iv, ctWithTag, aad) => {
  const cryptoKey = await importAesKey(key, 'decrypt');
  try {
    const plaintext = await getWebCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: toUint8(iv),
        additionalData: utf8Encode(aad),
        tagLength: 128,
      },
      cryptoKey,
      toUint8(ctWithTag),
    );
    return new Uint8Array(plaintext);
  } catch (error) {
    // WebCrypto reports a bad tag as a bare OperationError; the vault core
    // only needs the code.
    throw new VaultCryptoError(
      VAULT_CRYPTO_ERROR_CODES.AUTH_FAILED,
      'AES-GCM authentication failed',
      error,
    );
  }
};
