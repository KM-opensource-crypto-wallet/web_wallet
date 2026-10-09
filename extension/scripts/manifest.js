// Fills the manifest template (src/manifest.json) for one brand.
//
// host_permissions only list the backends this extension talks to with a
// non-browser Origin: the DokApi backend and, when configured, the Electrum
// bridge. Public RPCs and explorers already answer cross-origin requests from
// the web wallet, so they work from the extension origin without them.
const originPattern = url => {
  try {
    const {protocol, host} = new URL(url);
    return `${protocol}//${host}/*`;
  } catch {
    return null;
  }
};

const buildManifest = (template, {brand, version, env}) => {
  const manifest = JSON.parse(
    JSON.stringify(template)
      .replaceAll('__BRAND_NAME__', brand.name)
      .replaceAll('__BRAND_DESCRIPTION__', brand.description)
      .replaceAll('__VERSION__', version),
  );
  const hosts = [env.DOK_WALLET_BASE_URL, env.EXT_ELECTRUM_BRIDGE_URL]
    .map(originPattern)
    .filter(Boolean);
  manifest.host_permissions = [
    ...new Set([...manifest.host_permissions, ...hosts]),
  ];
  if (process.env.EXTENSION_KEY) {
    // Pins the extension id in development so the OAuth redirect URI
    // (https://<id>.chromiumapp.org/) stays stable. Never ship a private key.
    manifest.key = process.env.EXTENSION_KEY;
  }
  return manifest;
};

module.exports = {buildManifest};
