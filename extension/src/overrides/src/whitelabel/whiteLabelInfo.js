// Extension `whitelabel/whiteLabelInfo`: the web module, except the parts
// that read the page's own location (chrome-extension://<id> here).
import {getWalletConnectDetails as getWebWalletConnectDetails} from '@web-original/src/whitelabel/whiteLabelInfo';

export * from '@web-original/src/whitelabel/whiteLabelInfo';

// The brand's domain, as the web build would see it on its own host.
export const getHostName = () => process.env.EXT_WHITE_LABEL_DOMAIN;

// WalletConnect shows metadata.url to the dApp; the web build uses its own
// origin, which here would be chrome-extension://<id>.
export const getWalletConnectDetails = () => {
  const details = getWebWalletConnectDetails();
  if (!details?.metadata) {
    return details;
  }
  return {
    ...details,
    metadata: {...details.metadata, url: process.env.EXT_WEBSITE_URL},
  };
};
