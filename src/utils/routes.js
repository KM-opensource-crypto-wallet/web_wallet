// Single source of truth for every in-app URL. Pages live under
// /wallet/{clientId}/..., and coin-scoped pages one level deeper under
// /wallet/{clientId}/home/send/{coinSlug}/..., so the wallet and the coin are
// always recoverable from the URL alone (reload, share, deep link).
//
// Pure functions: usable from React (via hooks/useAppRoutes) and from
// non-React code such as utils/navigation.js.

const walletBase = clientId => `/wallet/${clientId}`;
const coinBase = (clientId, coinSlug) =>
  `${walletBase(clientId)}/home/send/${coinSlug}`;

export const stripTrailingSlash = pathname => {
  if (!pathname) {
    return '';
  }
  return pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;
};

// Where a user with a password but no wallets goes: login, whose success
// path sends them on to create or import a wallet.
export const authRoutes = {
  login: '/auth/login',
};

export const walletRoutes = {
  home: clientId => `${walletBase(clientId)}/home`,
  coinSync: clientId => `${walletBase(clientId)}/home/coin-sync`,
  confirmBatch: clientId => `${walletBase(clientId)}/home/confirm-batch`,
  manageCoins: clientId => `${walletBase(clientId)}/manage-coins`,
  buyCrypto: clientId => `${walletBase(clientId)}/buy-crypto`,
  buyCryptoOtc2: clientId => `${walletBase(clientId)}/buy-crypto/otc2`,
  sellCrypto: clientId => `${walletBase(clientId)}/sell-crypto`,
  sellCryptoConfirm: clientId => `${walletBase(clientId)}/sell-crypto/confirm`,
  swap: clientId => `${walletBase(clientId)}/swap`,
  swapConfirm: clientId => `${walletBase(clientId)}/swap/confirm`,
  swapHistory: clientId => `${walletBase(clientId)}/swap/history`,
  swapHistoryDetails: (clientId, transactionId) =>
    `${walletBase(clientId)}/swap/history/${encodeURIComponent(transactionId)}`,
  walletConnect: clientId => `${walletBase(clientId)}/wallet-connect`,
  receivePaymentUrl: clientId => `${walletBase(clientId)}/receive-payment-url`,
  hideWallet: clientId => `${walletBase(clientId)}/wallets/hide-wallet`,
  verifyCreate: clientId => `${walletBase(clientId)}/verify/verify-create`,
  verifyScreen: clientId => `${walletBase(clientId)}/verify/verify-screen`,
};

export const coinRoutes = {
  send: (clientId, coinSlug) => coinBase(clientId, coinSlug),
  sendFunds: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/send-funds`,
  transfer: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/send-funds/transfer`,
  receiveFunds: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/receive-funds`,
  selectUtxos: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/select-UTXOs`,
  customDerivation: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/custom-derivation`,
  transactions: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/transactions`,
  transactionDetails: (clientId, coinSlug, txHash) =>
    `${coinBase(clientId, coinSlug)}/transactions/${encodeURIComponent(txHash)}`,
  updateTransaction: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/transactions/update-transaction`,
  stakingList: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/staking-list`,
  createStaking: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/create-staking`,
  voteStaking: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/vote-staking`,
  withdrawStaking: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/withdraw-staking`,
  confirmStaking: (clientId, coinSlug) =>
    `${coinBase(clientId, coinSlug)}/confirm-staking`,
};

// The link handed to a payer. It deliberately carries no wallet id: the
// payer opens it on their own wallet, and the legacy forwarder
// (components/LegacyRouteRedirect) resolves it to that wallet's coin page.
export const paymentLinkPath = coinSlug => `/home/send/${coinSlug}/send-funds`;

// Route names consumed by the shared submodule (walletsSlice refreshCoinData)
// to decide what to refresh after a send. Anything else returns the pathname.
const TRANSACTION_LIST_RE = /\/home\/send\/[^/]+\/transactions\/?$/;
const TRANSACTION_DETAILS_RE = /\/home\/send\/[^/]+\/transactions\/.+/;

export const getRouteNameFromPathname = pathname => {
  if (TRANSACTION_LIST_RE.test(pathname)) {
    return 'TransactionList';
  }
  if (TRANSACTION_DETAILS_RE.test(pathname)) {
    return 'TransactionDetails';
  }
  return pathname;
};
