// PBKDF2-HMAC-SHA256 off the main thread. 600k iterations take a few hundred
// milliseconds in WebCrypto; running them here keeps the login and confirm
// screens responsive. Same pattern as the *DerivePathWorker.js files.
//
// Message in : {password: string, salt: Uint8Array, iterations: number, keyLen: number}
// Message out: {ok: true, derived: ArrayBuffer} | {ok: false, message: string}
// Never post the password back and never log it: workers run outside the
// Sentry client and the payload must not end up in an error report.
onmessage = async function (event) {
  const {password, salt, iterations, keyLen} = event.data || {};
  try {
    const subtle = self.crypto?.subtle;
    if (!subtle) {
      throw new Error('WebCrypto is not available in this worker');
    }
    const keyMaterial = await subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      {name: 'PBKDF2'},
      false,
      ['deriveBits'],
    );
    const derived = await subtle.deriveBits(
      {name: 'PBKDF2', salt, iterations, hash: 'SHA-256'},
      keyMaterial,
      keyLen * 8,
    );
    postMessage({ok: true, derived}, [derived]);
  } catch (error) {
    postMessage({ok: false, message: error?.message || 'kdf worker failed'});
  }
};
