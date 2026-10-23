// Google sign-in for Drive backup, replacing NextAuth + the /api/auth route.
//
// chrome.identity.launchWebAuthFlow runs Google's OAuth consent in a browser
// window and hands back an access token (implicit flow), so no client secret
// and no server are involved. The OAuth client must be a "Web application"
// client in the SAME Google Cloud project as the brand's mobile app (Drive
// appDataFolder is per project), with this authorised redirect URI:
//   https://<extension-id>.chromiumapp.org/
// (shown by getRedirectUri() and in the README).
//
// The flow runs in the service worker (runGoogleAuthFlow), so it completes
// even if the page that started it (side panel or tab) is closed meanwhile.
// Pages ask for it by message and see the result through storage, so a page
// opened after signing in is already signed in.
//
// The token lives in chrome.storage.session: memory only, gone when the
// browser closes, not readable by content scripts.
export const GOOGLE_SIGN_IN_MESSAGE = 'google-sign-in';
const STORAGE_KEY = 'google.session';
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata',
];
// Refresh a little before Google's expiry so a request never starts with a
// token that dies mid-flight.
const EXPIRY_MARGIN_MS = 60 * 1000;

const listeners = new Set();
let cached;

export const isGoogleAuthConfigured = () =>
  Boolean(process.env.EXT_GOOGLE_CLIENT_ID);

export const getRedirectUri = () => chrome.identity.getRedirectURL();

const isValid = session =>
  Boolean(session?.accessToken) &&
  session.expiresAt - EXPIRY_MARGIN_MS > Date.now();

export const readGoogleSession = async () => {
  if (cached !== undefined) {
    return isValid(cached) ? cached : null;
  }
  const stored = (await chrome.storage.session.get(STORAGE_KEY))[STORAGE_KEY];
  cached = stored || null;
  return isValid(cached) ? cached : null;
};

const writeSession = async session => {
  cached = session;
  if (session) {
    await chrome.storage.session.set({[STORAGE_KEY]: session});
  } else {
    await chrome.storage.session.remove(STORAGE_KEY);
  }
};

// Every context (this page, the service worker, other pages) writes through
// storage, so this is the one place the cache and the listeners update.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'session' || !(STORAGE_KEY in changes)) {
    return;
  }
  cached = changes[STORAGE_KEY].newValue ?? null;
  listeners.forEach(listener => listener(isValid(cached) ? cached : null));
});

export const onGoogleSessionChange = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const authUrl = interactive => {
  const params = new URLSearchParams({
    client_id: process.env.EXT_GOOGLE_CLIENT_ID,
    response_type: 'token',
    redirect_uri: getRedirectUri(),
    scope: SCOPES.join(' '),
    include_granted_scopes: 'true',
    prompt: interactive ? 'select_account' : 'none',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

const fetchUser = async accessToken => {
  const response = await fetch(
    'https://openidconnect.googleapis.com/v1/userinfo',
    {headers: {Authorization: `Bearer ${accessToken}`}},
  );
  if (!response.ok) {
    return {};
  }
  const {email, name, picture} = await response.json();
  return {email, name, image: picture};
};

const assertConfigured = () => {
  if (!isGoogleAuthConfigured()) {
    throw new Error(
      'Google sign-in is not configured for this build (set the extension OAuth client id).',
    );
  }
};

/** Service worker only: runs the OAuth flow and stores the session. */
export const runGoogleAuthFlow = async ({interactive = true} = {}) => {
  assertConfigured();
  const redirect = await chrome.identity.launchWebAuthFlow({
    url: authUrl(interactive),
    interactive,
  });
  const fragment = new URLSearchParams(new URL(redirect).hash.slice(1));
  const error = fragment.get('error');
  if (error) {
    throw new Error(`Google sign-in failed: ${error}`);
  }
  const accessToken = fragment.get('access_token');
  if (!accessToken) {
    throw new Error('Google sign-in returned no access token');
  }
  const expiresIn = Number(fragment.get('expires_in')) || 3600;
  const session = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
    user: await fetchUser(accessToken),
  };
  await writeSession(session);
  return session;
};

/** From a page: asks the service worker to sign in (see the header). */
export const signInWithGoogle = async ({interactive = true} = {}) => {
  assertConfigured();
  const response = await chrome.runtime.sendMessage({
    type: GOOGLE_SIGN_IN_MESSAGE,
    interactive,
  });
  if (!response?.ok) {
    throw new Error(response?.error || 'Google sign-in failed');
  }
  cached = response.session;
  return response.session;
};

/**
 * A valid access token, silently re-authorising once the hour-long token has
 * expired (no window when the user already granted access). Throws an error
 * with code AUTH_EXPIRED when the user has to sign in again, which the backup
 * and restore pages already handle.
 */
export const getGoogleAccessToken = async () => {
  const session = await readGoogleSession();
  if (session) {
    return session.accessToken;
  }
  try {
    return (await signInWithGoogle({interactive: false})).accessToken;
  } catch {
    await writeSession(null);
    const error = new Error('Session expired. Please sign in again.');
    error.code = 'AUTH_EXPIRED';
    throw error;
  }
};

// Like NextAuth's signOut on the web: forget the token, keep the grant.
export const signOutOfGoogle = () => writeSession(null);
