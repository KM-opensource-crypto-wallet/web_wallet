import {setWhiteLabelIdToDokApi} from 'dok-wallet-blockchain-networks/config/dokApi';

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
export const DOK_WALLET_ID = '656d95510a58ec43999a0f77';
export const KIML_WALLET_ID = '65efefca5f95b9f06cc8f9eb';

export const setWhiteLabelInfo = info => {
  whiteLabelInfo = info;
  setWhiteLabelIdToDokApi(getWhiteLabelId());
  const isKimlWallet = whiteLabelInfo?._id === KIML_WALLET_ID;
  if (isKimlWallet) {
    document.documentElement.style.setProperty('--background', '#4F8DD8');
  }
};

export const isBackupRestoreEnabled = () => {
  const whiteLabelId = getWhiteLabelId();
  return whiteLabelId === DOK_WALLET_ID || whiteLabelId === KIML_WALLET_ID;
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
