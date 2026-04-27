import {
  setWhiteLabelIdToDokApi,
  setAppNameToDokApi,
} from 'dok-wallet-blockchain-networks/config/dokApi';

let whiteLabelInfo = {};

const dokwalletWalletConnectDetails = {
  id: process.env.WALLET_CONNECT_ID,
  metadata: {
    description: 'Dokwallet',
    icons: [
      'https://moreover4u2-wl-resources.s3.eu-north-1.amazonaws.com/dokwallet/dokwallet_200.png',
    ],
    name: 'Dokwallet',
    ssl: true,
    url: 'https://dokwallet.com',
  },
};
export const setWhiteLabelInfo = info => {
  whiteLabelInfo = info;
  setWhiteLabelIdToDokApi(getWhiteLabelId());
  setAppNameToDokApi(getAppName());
  const isKimlWallet = whiteLabelInfo?._id === '65efefca5f95b9f06cc8f9eb';
  if (isKimlWallet) {
    document.documentElement.style.setProperty('--background', '#4F8DD8');
  }
};

export const getHostName = () => {
  if (typeof window !== 'undefined') {
    const currentHostName = window?.location?.hostname;
    return currentHostName || 'dokwallet';
  }
  return 'dokwallet';
};

export const getAppName = () => {
  return whiteLabelInfo?.name?.toLowerCase() || 'dokwallet';
};

export const getAppSubTitle = () => {
  return whiteLabelInfo?.subTitle || 'DOK WALLET';
};

export const getPrivacyUrl = () => {
  return (
    whiteLabelInfo.privacyPolicyUrl ||
    'https://dokwallet.com/privacypolicy.html'
  );
};

export const getTermsUrl = () => {
  return whiteLabelInfo.termsUrl || 'https://dokwallet.com/terms.html';
};

export const getWalletConnectDetails = () => {
  return whiteLabelInfo?.walletConnect || dokwalletWalletConnectDetails;
};

export const getShownOTC = () => {
  return whiteLabelInfo?.metadata?.shownOTC ?? true;
};

export const getAppTitle = () => {
  return whiteLabelInfo?.title ?? 'Dok Wallet';
};

export const getWhiteLabelId = () => {
  return whiteLabelInfo?._id ?? '656d95510a58ec43999a0f77';
};

export const getAppIcon = () => {
  return whiteLabelInfo?.appIcon?.light ?? '/dokwallet.ico';
};

export const getAppIconDark = () => {
  return whiteLabelInfo?.appIcon?.dark ?? '/dokwallet.ico';
};

export const getAppAssets = () => {
  return whiteLabelInfo?.assets || {};
};

export const getAppLogo = () => {
  return whiteLabelInfo?.logo;
};

export const getBuyCryptoProviders = () => {
  return Array.isArray(whiteLabelInfo?.metadata?.cryptoProviders)
    ? whiteLabelInfo?.metadata?.cryptoProviders
    : [];
};

export const getDesktopWalletUrl = () => {
  return whiteLabelInfo?.desktopWalletUrl;
};

export const getContactUsEmail = () => {
  return whiteLabelInfo?.contactUsEmail;
};

export const getDefaultLocale = () => {
  return whiteLabelInfo?.defaultLocale || 'en';
};

export const getIsBuyCryptoInNewTab = () => {
  return whiteLabelInfo?.isBuyCryptoInNewTab ?? false;
};

export const is51Pegasi = () => {
  return getWhiteLabelId() === '656ef5754f6f203ba7fccf45';
};

export const isCastor24 = () => {
  return getWhiteLabelId() === '68ea4a7e792250aa1195603b';
};

export const isUsdtNotSupportedWL = () => {
  return is51Pegasi() || isCastor24();
};
