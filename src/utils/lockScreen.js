// One-shot "skip the lock screen on the next full page load".
//
// AppRouting locks on every full load unless the auto-lock window is open.
// Some flows legitimately reload right after the user has authenticated:
// the Google OAuth round-trip for Drive backup/restore, and the post-login
// replay of a deep link that turns out to be an unknown URL (Next loads the
// 404 page as a new document). Without this flag those flows bounce straight
// back to login, and the unknown-URL case loops forever.
const SKIP_LOCK_SCREEN_KEY = 'skip_lock_screen';

const hasSession = () =>
  typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';

// `ttlMs`: clear the flag again if no reload consumed it in time, so a soft
// (client-side) navigation does not leave a stale skip behind for a manual
// reload hours later. The OAuth flows omit it: the provider round-trip can
// take a while and always ends in a full load.
export const skipLockOnNextLoad = ({ttlMs} = {}) => {
  if (!hasSession()) {
    return;
  }
  sessionStorage.setItem(SKIP_LOCK_SCREEN_KEY, 'true');
  if (ttlMs > 0) {
    setTimeout(() => sessionStorage.removeItem(SKIP_LOCK_SCREEN_KEY), ttlMs);
  }
};

export const shouldSkipLockScreen = () =>
  hasSession() && sessionStorage.getItem(SKIP_LOCK_SCREEN_KEY) === 'true';

export const clearSkipLockScreen = () => {
  if (hasSession()) {
    sessionStorage.removeItem(SKIP_LOCK_SCREEN_KEY);
  }
};
