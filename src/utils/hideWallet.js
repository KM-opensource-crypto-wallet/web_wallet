import {Buffer} from 'buffer';

export const SECRET_CODE_MIN_LENGTH = 5;
export const SECRET_CODE_MAX_LENGTH = 50;
export const SECRET_CODE_REGEX = /^[A-Za-z0-9@_-]{5,50}$/;
export const SECRET_CODE_ITERATIONS = 100000;
const SALT_BYTES = 16;
const KEY_LENGTH = 32; // 32 bytes -> 256 bits
const DIGEST = 'SHA-256';

// The shared submodule (redux/wallets/walletsSlice.js) imports verifySecretCode
// from this app-level module. On web there is no react-native-quick-crypto, so
// the PBKDF2 work runs on the Web Crypto API. Hashes only ever need to be
// internally consistent on the same device (hidden wallets are not cloud-backed),
// so the digest need not match the mobile app's output.
const getWebCrypto = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto;
  }
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto;
  }
  throw new Error('Web Crypto API is not available in this environment');
};

export const normalizeSecretCode = code => (code || '').trim().toLowerCase();

export const isSecretCodeFormatValid = code =>
  SECRET_CODE_REGEX.test(normalizeSecretCode(code));

// Wallet names are plainly visible in the app - a code that IS another
// wallet's name would be trivially guessable, and typing that name in the
// Wallets search box would accidentally reveal the hidden wallet.
export const secretCodeMatchesWalletName = (code, walletNames = []) => {
  const normalizedCode = normalizeSecretCode(code);
  if (!normalizedCode) {
    return false;
  }
  return walletNames.some(name => normalizeSecretCode(name) === normalizedCode);
};

export const generateSecretCodeSalt = () => {
  const bytes = new Uint8Array(SALT_BYTES);
  getWebCrypto().getRandomValues(bytes);
  return Buffer.from(bytes).toString('hex');
};

export const hashSecretCode = async (
  code,
  salt,
  iterations = SECRET_CODE_ITERATIONS,
) => {
  const normalized = normalizeSecretCode(code);
  const webCrypto = getWebCrypto();
  const passwordBuffer = new Uint8Array(Buffer.from(normalized, 'utf8'));
  const saltBuffer = new Uint8Array(Buffer.from(salt, 'hex'));
  const keyMaterial = await webCrypto.subtle.importKey(
    'raw',
    passwordBuffer,
    {name: 'PBKDF2'},
    false,
    ['deriveBits'],
  );
  const derivedBits = await webCrypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: DIGEST,
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  return Buffer.from(new Uint8Array(derivedBits)).toString('hex');
};

export const verifySecretCode = async (
  code,
  salt,
  iterations,
  expectedHash,
) => {
  if (!salt || !iterations || !expectedHash) {
    return false;
  }
  const computedHash = await hashSecretCode(code, salt, iterations);
  const computedBuffer = Buffer.from(computedHash, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  if (computedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  // Constant-time comparison (crypto.timingSafeEqual is not available in-browser)
  let diff = 0;
  for (let i = 0; i < computedBuffer.length; i++) {
    diff |= computedBuffer[i] ^ expectedBuffer[i];
  }
  return diff === 0;
};
