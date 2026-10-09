// Unlock session for the extension.
//
// The web wallet locks on every page load because the vault key (DEK) lives
// only in page memory. An extension page (side panel, tab) is opened and
// closed all the time, so after an unlock the DEK is also kept in
// chrome.storage.session: in memory only, cleared when the browser quits,
// not readable by content scripts. The next page opened within the auto-lock
// time unlocks from it instead of asking for the password.
//
// It is stored through the shared vault's "biometric" slot (the
// security/secureStore override puts that item here), so the vault code in
// the submodule is unchanged. The service worker removes it when the
// auto-lock time has passed since the last activity (background/autoLock.js).
export const SESSION_KEYS = Object.freeze({
  dek: 'vault.session.dek',
  lastActive: 'session.lastActive',
  lockTime: 'session.lockTime',
  lockedAt: 'session.lockedAt',
});

const area = () => chrome.storage.session;

export const readSessionDek = async () =>
  (await area().get(SESSION_KEYS.dek))[SESSION_KEYS.dek] ?? null;

export const writeSessionDek = value => area().set({[SESSION_KEYS.dek]: value});

export const removeSessionDek = () => area().remove(SESSION_KEYS.dek);

export const touchSession = () =>
  area()
    .set({[SESSION_KEYS.lastActive]: Date.now()})
    .catch(() => {});

// Minutes, as in the settings slice. 0 ("only on reload" on the web) means:
// never keep the session, so every new page asks for the password.
export const setSessionLockTime = minutes =>
  area()
    .set({[SESSION_KEYS.lockTime]: Number(minutes) || 0})
    .catch(() => {});

export const isSessionExpired = ({lastActive, lockTime, now = Date.now()}) =>
  !(lockTime > 0) || !lastActive || now - lastActive >= lockTime * 60 * 1000;

/** Whether a stored session may be used right now; removes a stale one. */
export const hasUsableSession = async () => {
  const values = await area().get(Object.values(SESSION_KEYS));
  if (!values[SESSION_KEYS.dek]) {
    return false;
  }
  if (
    isSessionExpired({
      lastActive: values[SESSION_KEYS.lastActive],
      lockTime: values[SESSION_KEYS.lockTime],
    })
  ) {
    await removeSessionDek();
    return false;
  }
  return true;
};

// An explicit lock (idle lock, logout, reset) in one page locks every other
// open extension page. Session expiry in the service worker does not: it
// only stops the NEXT page from unlocking without the password.
export const broadcastLock = () =>
  area()
    .set({[SESSION_KEYS.lockedAt]: Date.now()})
    .catch(() => {});

export const onLockBroadcast = listener => {
  const handler = (changes, areaName) => {
    if (areaName === 'session' && changes[SESSION_KEYS.lockedAt]?.newValue) {
      listener();
    }
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
};
