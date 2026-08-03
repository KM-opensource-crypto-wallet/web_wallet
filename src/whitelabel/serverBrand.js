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
  'kimlview.xyz': 'kimlwallet',
  'www.kimlview.xyz': 'kimlwallet',
  'app.kimlwallet.com': 'kimlwallet',
  'www.app.kimlwallet.com': 'kimlwallet',
};

export function getBrandFromHost(host) {
  const key = (host ?? '').toLowerCase().split(':')[0];
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
