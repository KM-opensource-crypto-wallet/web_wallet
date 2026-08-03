/**
 * Google Drive Backup/Restore Service for Web
 *
 * Uses Next.js API Routes for Drive operations.
 * Uses Web Crypto API for AES-256-GCM encryption on the client side.
 *
 * The encrypted format is byte-compatible with the mobile app
 * (dokwallet_app/src/utils/googleDriveBackup.js) so backups created on
 * either platform can be restored on the other.
 */

// Version prefixes for encrypted payloads
// v1-gcm: key derived from the app-wide WALLET_BACKUP_SECRET only (legacy)
// v2-gcm: key derived from a user-supplied backup password + WALLET_BACKUP_SECRET
const VERSION_V1_GCM = 'v1-gcm:';
const VERSION_V2_GCM = 'v2-gcm:';

export const BACKUP_ERROR_CODES = {
  PASSWORD_REQUIRED: 'BACKUP_PASSWORD_REQUIRED',
  WRONG_PASSWORD: 'BACKUP_WRONG_PASSWORD',
  CORRUPTED: 'BACKUP_CORRUPTED',
  NO_BACKUP: 'BACKUP_NOT_FOUND',
};

const createBackupError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

// The app-wide secret is fetched from the server on demand and kept in
// memory only. It matches the mobile app's WALLET_BACKUP_SECRET.
let cachedSecret = null;

const fetchBackupSecret = async () => {
  if (cachedSecret) {
    return cachedSecret;
  }
  const response = await fetch('/api/drive/backup/key');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || 'Failed to fetch backup secret. Please sign in.',
    );
  }
  const {secret} = await response.json();
  if (!secret) {
    throw new Error('Server returned an empty backup secret');
  }
  cachedSecret = secret;
  return secret;
};

// The user's backup password is the load-bearing secret; the app secret only
// adds defense in depth. WALLET_BACKUP_SECRET must never change once shipped —
// v2 backups mix it into their key and would become unrecoverable.
const getV2KeyMaterial = (userPassword, secret) =>
  `${userPassword}\x00${secret}`;

// btoa(String.fromCharCode(...bytes)) overflows the call stack on large
// payloads, so convert in chunks.
const bytesToBase64 = bytes => {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

const base64ToBytes = base64 =>
  Uint8Array.from(atob(base64), c => c.charCodeAt(0));

// Key derivation using PBKDF2-SHA256 (same parameters as mobile)
const deriveKey = async (keyMaterial, salt) => {
  if (!keyMaterial) {
    throw new Error('Encryption password is not configured');
  }
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(keyMaterial),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    {name: 'AES-GCM', length: 256},
    false,
    ['encrypt', 'decrypt'],
  );
};

// Payload layout (same for v1/v2): [16-byte salt][12-byte nonce][ciphertext][16-byte auth tag]
// WebCrypto consumes/produces ciphertext with the auth tag appended, so the
// tag is never split off separately here.
const parsePayload = (ciphertext, prefix) => {
  const rawData = base64ToBytes(ciphertext.slice(prefix.length));

  // Minimum size: 16 (salt) + 12 (nonce) + 1 (min ciphertext) + 16 (auth tag) = 45 bytes
  if (rawData.length < 45) {
    throw createBackupError(
      BACKUP_ERROR_CODES.CORRUPTED,
      'Invalid encrypted data: too short',
    );
  }

  return {
    salt: rawData.subarray(0, 16),
    nonce: rawData.subarray(16, 28),
    encryptedWithTag: rawData.subarray(28),
  };
};

// Encryption with AES-256-GCM (authenticated encryption)
// Always writes the v2 format keyed by the user's backup password
export const encryptData = async (data, userPassword) => {
  if (!userPassword) {
    throw createBackupError(
      BACKUP_ERROR_CODES.PASSWORD_REQUIRED,
      'A backup password is required to encrypt the backup.',
    );
  }
  try {
    const jsonString = JSON.stringify(data);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const nonce = crypto.getRandomValues(new Uint8Array(12)); // GCM standard nonce size

    const secret = await fetchBackupSecret();
    const key = await deriveKey(getV2KeyMaterial(userPassword, secret), salt);

    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt(
        {name: 'AES-GCM', iv: nonce},
        key,
        new TextEncoder().encode(jsonString),
      ),
    );

    const payload = new Uint8Array(
      salt.length + nonce.length + encrypted.length,
    );
    payload.set(salt, 0);
    payload.set(nonce, salt.length);
    payload.set(encrypted, salt.length + nonce.length);

    return VERSION_V2_GCM + bytesToBase64(payload);
  } catch (error) {
    console.error('Encryption Failed:', error);
    if (error?.code) {
      throw error;
    }
    throw new Error('Failed to encrypt wallet data');
  }
};

// Decryption with AES-256-GCM (authenticated decryption)
// v1 backups decrypt with the app secret (no password), v2 with the user's password
export const decryptData = async (ciphertext, userPassword) => {
  const isV2 =
    typeof ciphertext === 'string' && ciphertext.startsWith(VERSION_V2_GCM);
  const isV1 =
    typeof ciphertext === 'string' && ciphertext.startsWith(VERSION_V1_GCM);

  if (!isV1 && !isV2) {
    throw createBackupError(
      BACKUP_ERROR_CODES.CORRUPTED,
      'Failed to decrypt wallet backup. Invalid password or corrupted file.',
    );
  }
  if (isV2 && !userPassword) {
    throw createBackupError(
      BACKUP_ERROR_CODES.PASSWORD_REQUIRED,
      'A backup password is required to unlock this backup.',
    );
  }

  try {
    const {salt, nonce, encryptedWithTag} = parsePayload(
      ciphertext,
      isV2 ? VERSION_V2_GCM : VERSION_V1_GCM,
    );

    const secret = await fetchBackupSecret();
    const key = await deriveKey(
      isV2 ? getV2KeyMaterial(userPassword, secret) : secret,
      salt,
    );

    let decrypted;
    try {
      // GCM authentication happens during decryption - throws if tag is invalid
      decrypted = await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: nonce},
        key,
        encryptedWithTag,
      );
    } catch (authError) {
      if (isV2) {
        throw createBackupError(
          BACKUP_ERROR_CODES.WRONG_PASSWORD,
          'Incorrect backup password.',
        );
      }
      throw authError;
    }

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (error) {
    console.error('Decryption Failed:', error);
    if (error?.code) {
      throw error;
    }
    throw createBackupError(
      BACKUP_ERROR_CODES.CORRUPTED,
      'Failed to decrypt wallet backup. Invalid password or corrupted file.',
    );
  }
};

// ============================================
// Backup / Restore Functions
// ============================================

export const backupWalletsToDrive = async (payload, userPassword) => {
  if (!userPassword) {
    throw createBackupError(
      BACKUP_ERROR_CODES.PASSWORD_REQUIRED,
      'A backup password is required to encrypt the backup.',
    );
  }
  try {
    let finalWallets = [];
    let masterClientId = payload.masterClientId;

    // 1. Try to fetch existing backup to merge
    try {
      const {encryptedData} = await fetchEncryptedBackup();
      const existingData = await decryptData(encryptedData, userPassword);
      if (existingData && Array.isArray(existingData.wallets)) {
        finalWallets = existingData.wallets;
        // Keep existing masterClientId if not provided in new payload (though usually it is)
        if (!masterClientId && existingData.masterClientId) {
          masterClientId = existingData.masterClientId;
        }
      }
    } catch (e) {
      if (e?.code === BACKUP_ERROR_CODES.WRONG_PASSWORD) {
        throw createBackupError(
          BACKUP_ERROR_CODES.WRONG_PASSWORD,
          "This password doesn't match your existing backup. Enter the same password you used before, or delete the existing backup first.",
        );
      }
      if (
        e?.code !== BACKUP_ERROR_CODES.NO_BACKUP &&
        e?.message !== 'No backup file found.'
      ) {
        throw e;
      }
    }

    // 2. Merge new wallets: Update existing if found (matched by clientId or name+chain), or add new
    const newWallets = payload.wallets || [];
    newWallets.forEach(newW => {
      const index = finalWallets.findIndex(
        oldW =>
          (oldW.clientId && oldW.clientId === newW.clientId) ||
          (oldW.walletName === newW.walletName &&
            oldW.chain_name === newW.chain_name),
      );

      if (index !== -1) {
        // Update existing wallet with new details (e.g. updated balances, new coins)
        finalWallets[index] = {
          ...finalWallets[index],
          ...newW,
        };
      } else {
        finalWallets.push(newW);
      }
    });

    const mergedData = {
      wallets: finalWallets,
      masterClientId,
      timestamp: new Date().toISOString(),
      version: 2,
    };

    // 3. Encrypt Data
    const encryptedData = await encryptData(mergedData, userPassword);
    const fileContent = JSON.stringify({
      data: encryptedData,
      timestamp: new Date().toISOString(),
      version: 2,
    });

    // 4. Upload via API (server does delete-then-create)
    const response = await fetch('/api/drive/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({fileContent}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const uploadError = new Error(errorData.error || 'Backup failed');
      if (errorData.code) {
        uploadError.code = errorData.code;
      }
      throw uploadError;
    }

    return await response.json();
  } catch (error) {
    console.error('Drive Backup Failed:', error);
    throw error;
  }
};

// Downloads the encrypted backup file without decrypting it, so callers can
// check needsPassword and prompt the user before attempting decryption
export const fetchEncryptedBackup = async () => {
  try {
    const response = await fetch('/api/drive/restore');

    if (response.status === 404) {
      throw createBackupError(
        BACKUP_ERROR_CODES.NO_BACKUP,
        'No backup file found.',
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const fetchError = new Error(errorData.error || 'Restore failed');
      if (errorData.code) {
        fetchError.code = errorData.code;
      }
      throw fetchError;
    }

    const {fileContent} = await response.json();

    const parsedContent =
      typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;

    if (!parsedContent || !parsedContent.data) {
      throw createBackupError(
        BACKUP_ERROR_CODES.CORRUPTED,
        'Invalid backup file format.',
      );
    }

    return {
      encryptedData: parsedContent.data,
      needsPassword:
        typeof parsedContent.data === 'string' &&
        parsedContent.data.startsWith(VERSION_V2_GCM),
    };
  } catch (error) {
    console.error('Fetch Backup Failed:', error);
    throw error;
  }
};

// Async on web (mobile's is sync) — callers must await
export const decryptBackup = (encryptedData, userPassword) =>
  decryptData(encryptedData, userPassword);

export const deleteWalletBackup = async () => {
  try {
    const response = await fetch('/api/drive/backup', {method: 'DELETE'});

    if (response.status === 404) {
      throw new Error('No backup file found to delete.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const deleteError = new Error(errorData.error || 'Delete backup failed');
      if (errorData.code) {
        deleteError.code = errorData.code;
      }
      throw deleteError;
    }

    return true;
  } catch (error) {
    console.error('Delete Backup Failed:', error);
    throw error;
  }
};
