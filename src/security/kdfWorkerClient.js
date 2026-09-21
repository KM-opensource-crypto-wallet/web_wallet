// Runs one PBKDF2 derivation in src/workers/kdfWorker.js. Isolated from
// vaultCrypto.js so the `new URL(..., import.meta.url)` worker reference (which
// webpack turns into a separate chunk) lives in exactly one place.
export const canUseKdfWorker = () =>
  typeof window !== 'undefined' && typeof Worker !== 'undefined';

export const pbkdf2InWorker = (password, salt, iterations, keyLen) =>
  new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL('../workers/kdfWorker.js', import.meta.url));
    } catch (error) {
      reject(error);
      return;
    }
    const done = () => worker.terminate();
    worker.onmessage = event => {
      done();
      const data = event.data || {};
      if (data.ok) {
        resolve(new Uint8Array(data.derived));
      } else {
        reject(new Error(data.message || 'kdf worker failed'));
      }
    };
    worker.onerror = event => {
      done();
      // `event.error` is often absent for worker ErrorEvents; never attach
      // the posted payload (it holds the password).
      reject(event.error ?? new Error(event.message || 'kdf worker error'));
    };
    // Copy the salt so the caller's buffer is not detached by transfer.
    worker.postMessage({
      password,
      salt: new Uint8Array(salt),
      iterations,
      keyLen,
    });
  });
