// Auto-lock while no extension page is open.
//
// Open pages lock themselves (AppRouting's idle check). Once they are closed,
// only the session-held DEK remains (src/extension/session.js); this alarm
// removes it when the auto-lock time has passed since the last activity, so
// the next page asks for the password again. Browser restart clears
// chrome.storage.session anyway.
import {SESSION_KEYS, isSessionExpired} from '@ext/extension/session';

const ALARM = 'session-auto-lock';

export const startAutoLock = () => {
  // One minute is the shortest alarm period Chrome guarantees; auto-lock
  // options are whole minutes.
  chrome.alarms.create(ALARM, {periodInMinutes: 1});
};

export const checkSessionExpiry = async alarm => {
  if (alarm?.name !== ALARM) {
    return;
  }
  const values = await chrome.storage.session.get([
    SESSION_KEYS.dek,
    SESSION_KEYS.lastActive,
    SESSION_KEYS.lockTime,
  ]);
  if (!values[SESSION_KEYS.dek]) {
    return;
  }
  if (
    isSessionExpired({
      lastActive: values[SESSION_KEYS.lastActive],
      lockTime: values[SESSION_KEYS.lockTime],
    })
  ) {
    await chrome.storage.session.remove(SESSION_KEYS.dek);
  }
};
