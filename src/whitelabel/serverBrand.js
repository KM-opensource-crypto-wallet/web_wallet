/**
 * Server-side host -> brand resolution for API routes.
 *
 * Client-side brand info (whiteLabelInfo.js) is fetched from the backend and
 * held in browser state, so it is not available in server routes. This module
 * resolves the brand from the request Host header instead.
 */
export const HOST_TO_BRAND = {
  'dokwallet.app': 'dokwallet',
  'www.dokwallet.app': 'dokwallet',
  'app.dokwallet.com': 'dokwallet',
  'www.app.dokwallet.com': 'dokwallet',
  'kimlview.xyz': 'kimlwallet',
  'www.kimlview.xyz': 'kimlwallet',
  'app.kimlwallet.com': 'kimlwallet',
  'www.app.kimlwallet.com': 'kimlwallet',
};

/**
 * The domain to resolve the brand for. In development, DEV_WHITE_LABEL_DOMAIN
 * (e.g. `app.kimlwallet.com` in .env.local) stands in for the request host, so
 * any brand can be run on http://localhost:3000. localhost has to stay the
 * origin: browsers only expose Web Crypto (the vault) on secure contexts, and
 * plain http on any other host is not one.
 */
export function resolveWhiteLabelHost(host) {
  const devDomain = process.env.DEV_WHITE_LABEL_DOMAIN;
  console.log('process.env.NODE_ENV ', process.env.NODE_ENV);
  if (process.env.NODE_ENV === 'development' && devDomain) {
    return devDomain;
  }
  // A local production build (`yarn build && yarn start`) honours it too,
  // but only for localhost requests, so a deployed host is never overridden.
  const hostname = (host ?? '').toLowerCase().split(':')[0];
  if (devDomain && ['localhost', '127.0.0.1'].includes(hostname)) {
    return devDomain;
  }
  return host;
}

export function getBrandFromHost(host) {
  const key = (resolveWhiteLabelHost(host) ?? '').toLowerCase().split(':')[0];
  return HOST_TO_BRAND[key] ?? 'dokwallet';
}

/**
 * Each brand's web OAuth client must belong to the same Google Cloud project
 * as that brand's mobile app — Drive appDataFolder is per-project, so using
 * the wrong client makes mobile backups invisible on web (see README).
 */
export function getGoogleCredentials(brand) {
  if (brand === 'kimlwallet') {
    return {
      clientId: process.env.KIML_WALLET_GOOGLE_WEB_CLIENT_ID,
      clientSecret: process.env.KIML_WALLET_GOOGLE_WEB_CLIENT_SECRET,
    };
  }
  return {
    clientId: process.env.DOK_WALLET_GOOGLE_WEB_CLIENT_ID,
    clientSecret: process.env.DOK_WALLET_GOOGLE_WEB_CLIENT_SECRET,
  };
}
