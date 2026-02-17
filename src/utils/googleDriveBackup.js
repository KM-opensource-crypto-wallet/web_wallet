/**
 * Google Drive Backup/Restore Service for Web
 *
 * Uses Next.js API Routes for Drive operations.
 * Uses Web Crypto API for AES-256-GCM encryption on the client side.
 */

const VERSION_V1_GCM = 'v1-gcm:';

/**
 * Fetch the per-user encryption key from the server.
 * The server derives HMAC-SHA256(WALLET_BACKUP_SECRET, user-email).
 */
const fetchEncryptionKey = async () => {
  const response = await fetch('/api/drive/backup/key');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || 'Failed to fetch encryption key. Please sign in.',
    );
  }
  const {key} = await response.json();
  if (!key) {
    throw new Error('Server returned an empty encryption key');
  }
  return key;
};

/**
 * Derive key from password using PBKDF2
 */
const deriveKey = async (password, salt) => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
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
    keyMaterial,
    {name: 'AES-GCM', length: 256},
    false,
    ['encrypt', 'decrypt'],
  );
};

/**
 * Encrypt data with AES-256-GCM
 * Format: "v1-gcm:" + base64([16-byte salt][12-byte iv][ciphertext])
 */
const encryptData = async (data, password) => {
  try {
    const encoder = new TextEncoder();
    const jsonString = JSON.stringify(data);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    if (!password) {
      throw new Error('Encryption key not available');
    }

    const key = await deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      {name: 'AES-GCM', iv: iv},
      key,
      encoder.encode(jsonString),
    );

    // Concatenate salt + iv + ciphertext
    const payload = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength,
    );
    payload.set(salt, 0);
    payload.set(iv, salt.length);
    payload.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64
    const base64 = btoa(String.fromCharCode(...payload));
    return VERSION_V1_GCM + base64;
  } catch (error) {
    console.error('Encryption Failed:', error);
    throw new Error('Failed to encrypt wallet data');
  }
};

/**
 * Decrypt data with AES-256-GCM
 */
const decryptData = async (ciphertext, password) => {
  try {
    if (!password) {
      throw new Error('Decryption key not available');
    }

    // Check if format is valid before attempting decryption
    if (!ciphertext.startsWith(VERSION_V1_GCM)) {
      console.warn('Invalid encrypted data format');
      return null;
    }

    const base64Data = ciphertext.slice(VERSION_V1_GCM.length);
    const rawData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Minimum size: 16 (salt) + 12 (iv) + 1 (min ciphertext) = 29 bytes
    if (rawData.length < 29) {
      console.warn('Invalid encrypted data: too short');
      return null;
    }

    const salt = rawData.slice(0, 16);
    const iv = rawData.slice(16, 28);
    const encrypted = rawData.slice(28);

    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      {name: 'AES-GCM', iv: iv},
      key,
      encrypted,
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  } catch (error) {
    console.error('Decryption Failed:', error);
    throw new Error(
      'Failed to decrypt wallet backup. Invalid password or corrupted file.',
    );
  }
};

// ============================================
// Backup / Restore Functions
// ============================================

/**
 * Backup wallets to Google Drive via API
 */
export const backupWalletsToDrive = async payload => {
  try {
    // Fetch the per-user encryption key from the server
    const encryptionKey = await fetchEncryptionKey();

    let finalWallets = [];
    let masterClientId = payload.masterClientId;

    // Try to fetch existing backup to merge
    try {
      const existingData = await restoreWalletsFromDrive(encryptionKey);
      // If restore returns successful data:
      if (existingData && Array.isArray(existingData.wallets)) {
        finalWallets = existingData.wallets;
        if (!masterClientId && existingData.masterClientId) {
          masterClientId = existingData.masterClientId;
        }
      }
    } catch (e) {
      // Ignore if no backup found, propagate other errors
      if (
        e?.message !== 'No backup file found' &&
        !e?.message?.includes('No backup file found')
      ) {
        console.warn('Could not merge existing backup:', e);
      }
    }

    // Merge new wallets
    const newWallets = payload.wallets || [];
    newWallets.forEach(newW => {
      const index = finalWallets.findIndex(
        oldW =>
          (oldW.clientId && oldW.clientId === newW.clientId) ||
          (oldW.walletName === newW.walletName &&
            oldW.chain_name === newW.chain_name),
      );

      if (index !== -1) {
        finalWallets[index] = {...finalWallets[index], ...newW};
      } else {
        finalWallets.push(newW);
      }
    });

    const mergedData = {
      wallets: finalWallets,
      masterClientId,
      timestamp: new Date().toISOString(),
      version: 1,
    };

    // Encrypt Data with the per-user key
    const encryptedData = await encryptData(mergedData, encryptionKey);
    const fileContent = JSON.stringify({
      data: encryptedData,
      timestamp: new Date().toISOString(),
      version: 1,
    });

    // Upload via API
    const response = await fetch('/api/drive/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({fileContent}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Backup failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Backup Failed:', error);
    throw error;
  }
};

/**
 * Restore wallets from Google Drive via API
 * @param {string} [existingKey] - Optional pre-fetched encryption key (used during backup merge)
 */
export const restoreWalletsFromDrive = async existingKey => {
  try {
    // Use provided key or fetch a fresh one
    const encryptionKey = existingKey || (await fetchEncryptionKey());

    const response = await fetch('/api/drive/restore');

    if (response.status === 404) {
      throw new Error('No backup file found');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Restore failed');
    }

    const {fileContent} = await response.json();

    // fileContent is the JSON string containing { data: "...", ... }
    const parsedContent =
      typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;

    if (!parsedContent || !parsedContent.data) {
      // Return empty instead of error
      console.warn('Backup file found but content is empty/invalid.');
      return {wallets: []};
    }

    const decrypted = await decryptData(parsedContent.data, encryptionKey);
    if (!decrypted) {
      return {wallets: []};
    }
    return decrypted;
  } catch (error) {
    console.error('Restore Failed:', error);
    throw error;
  }
};

const googleDrive = {
  backupWalletsToDrive,
  restoreWalletsFromDrive,
};

export default googleDrive;
