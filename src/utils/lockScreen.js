// One-shot "don't replay the redirectRoute on the next full page load".
//
// Every full load locks (the vault key lives only in memory), so AppRouting
// always sends it to login. The post-login replay of a deep link that turns
// out to be an unknown URL reloads into the 404 page as a new document; with
// this flag set, AppRouting sends that load to login WITHOUT the
// redirectRoute, so the unknown URL is not replayed again in a loop.
const SKIP_LOCK_SCREEN_KEY = 'skip_lock_screen';

const hasSession = () =>
  typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';

// `ttlMs`: clear the flag again if no reload consumed it in time, so a soft
// (client-side) navigation does not leave a stale skip behind for a manual
// reload hours later.
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
