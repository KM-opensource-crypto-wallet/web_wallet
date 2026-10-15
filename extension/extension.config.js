// Build-time configuration for the extension.
//
// The web wallet picks its brand from the request host. An extension has no
// host (its origin is chrome-extension://<id>), so the brand is fixed per
// build: `yarn ext:build:kiml` (BRAND=kimlwallet) produces the KIML build.
const path = require('path');

const brands = {
  dokwallet: {
    name: 'DOK Wallet',
    description: 'DOK Wallet - multi-chain crypto wallet.',
    // Domain sent to /get-white-label; the backend answers with the same
    // wlData the web wallet gets on this host.
    whiteLabelDomain: 'www.dokwallet.app',
    // WalletConnect metadata.url (the web build uses window.location.origin).
    websiteUrl: 'https://dokwallet.com',
    iconDir: 'static/brands/dokwallet',
    // Env var names, so each brand reads its own OAuth client / WC project.
    googleClientIdEnv: 'DOK_WALLET_GOOGLE_EXTENSION_CLIENT_ID',
    walletConnectIdEnv: 'DOKWALLET_WALLET_CONNECT_ID',
  },
  kimlwallet: {
    name: 'KIML Wallet',
    description: 'KIML Wallet - multi-chain crypto wallet.',
    whiteLabelDomain: 'app.kimlwallet.com',
    websiteUrl: 'https://kimlwallet.com',
    iconDir: 'static/brands/kimlwallet',
    googleClientIdEnv: 'KIML_WALLET_GOOGLE_EXTENSION_CLIENT_ID',
    walletConnectIdEnv: 'KIMLWALLET_WALLET_CONNECT_ID',
  },
};

const brandKey = process.env.BRAND || 'dokwallet';
if (!brands[brandKey]) {
  throw new Error(
    `Unknown BRAND "${brandKey}". Known: ${Object.keys(brands).join(', ')}`,
  );
}

module.exports = {
  brandKey,
  brand: brands[brandKey],
  // Extension version (manifest.json). Independent of the web app's version:
  // the Chrome Web Store needs it to go up with every upload.
  version: '0.1.0',
  // The web wallet this extension is built from: the repo it lives in.
  webWalletDir: path.resolve(__dirname, '..'),
};
