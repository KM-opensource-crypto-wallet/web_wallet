import {shallowEqual, useSelector} from 'react-redux';
import {
  countTotalAssets,
  getBalanceForNativeCoin,
  getCoinsOptions,
  getCurrentWalletIsAddMoreAddressPopupHidden,
  getCurrentWalletPhrase,
  getFailedTransaction,
  getMasterClientId,
  getUserCoinsOptions,
  isAdding50MoreAddresses,
  isImportWalletWithPrivateKey,
  selectAllWalletName,
  selectAllWallets,
  selectCoinsForCurrentWallet,
  selectCurrentCoin,
  selectCurrentCoinRecentTransaction,
  selectCurrentWallet,
  selectCurrentWalletClientId,
  selectCurrentWalletSortOption,
  selectIsBackedUp,
  selectUserCoins,
  selectVisibleWallets,
  selectWalletConnectData,
  selectWalletConnectSessions,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  getHideSmallTransactions,
  getLocalCurrency,
  getLockTime,
  getPaymentUrlAmount,
  getPaymentUrlCoin,
  getPaymentUrlCurrencyAmount,
  isWalletReset,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  getHasAccount,
  getIsVaultUnlocked,
  getLastAttempt,
} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {
  getNewsMessage,
  isAskedBackedUpModal,
  selectAllCurrencies,
  selectAllNewCoins,
} from 'dok-wallet-blockchain-networks/redux/currency/currencySelectors';
import {
  getChainName,
  getOTCData,
  getPhrase,
  getPrivateKey,
  getRouteStateData,
} from 'dok-wallet-blockchain-networks/redux/extraData/extraSelectors';
import {
  selectCoinSyncProgress,
  selectCoinSyncStatus,
  selectCoinsWithBalance,
  selectCoinsWithBalanceCount,
  selectCurrentSyncingCoin,
  selectIsCreatingWallets,
  selectIsSyncing,
  selectSelectedCount,
  selectSyncingWalletClientId,
  selectSyncingWalletName,
} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSelectors';
import {
  getTransferData,
  getTransferDataCustomError,
  getTransferDataFeeSuccess,
  getTransferDataFeesOptions,
  getTransferDataLoading,
  getTransferDataSubmitting,
  getUpdateTransactionData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSelector';
import {getSentAddressHistory} from 'dok-wallet-blockchain-networks/redux/sentAddressHistory/sentAddressHistorySelectors';
import {
  getCryptoProviders,
  getCryptoProvidersLoading,
  getDisableMessage,
  getExchangeProviders,
  getGoogleAnalyticsKey,
  getTutorialVideos,
} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProvidersSelectors';
import {
  getSellCryptoError,
  getSellCryptoLoading,
  getSellCryptoProviders,
  getSellCryptoRequestDetails,
} from 'dok-wallet-blockchain-networks/redux/sellCrypto/sellCryptoSelectors';
import {
  getExchange,
  getExchangeApproveLoading,
  getExchangePermitApproveLoading,
  selectExchangeAmountFrom,
  selectExchangeAmountTo,
  selectExchangeFromAsset,
  selectExchangeFromWallet,
  selectExchangeLoading,
  selectExchangeToAddress,
  selectExchangeToAsset,
  selectExchangeToName,
  selectIsQuoteFetching,
  selectLowestPairMinimum,
  selectProviderRows,
  selectQuoteError,
  selectQuoteFetchedAt,
  selectSelectedExchangeChain,
} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSelectors';
import {
  selectCurrentExchangeTransaction,
  selectExchangeDetailError,
  selectExchangeDetailLoading,
  selectExchangeHistoryError,
  selectExchangeHistoryLoading,
  selectExchangeHistoryLoadingMore,
  selectExchangeHistoryMeta,
  selectExchangeHistoryRefreshing,
  selectExchangeTransactions,
} from 'dok-wallet-blockchain-networks/redux/exchangeHistory/exchangeHistorySelectors';
import {
  countSelectedVotes,
  getSelectedVotes,
  getStakingAllowanceLoading,
  getStakingLoading,
  getStakingValidatorsByChain,
} from 'dok-wallet-blockchain-networks/redux/staking/stakingSelectors';
import {selectAllCustomRpc} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSelectors';
import {
  isReduxStoreLoaded,
  selectWalletConnectTransactionData,
} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import {validateSupportedChain} from 'dok-wallet-blockchain-networks/helper';
import {isValidBrowser} from 'src/utils/common';
import {useMemo, useState} from 'react';
import {ALLOCATION_SLICES} from 'src/data/constants';
import {currencySymbol} from 'src/data/lists/currency';

// Coins this browser can show.
export const isSupportedCoin = item =>
  validateSupportedChain(item?.chain_name) &&
  (item?.chain_name !== 'thorchain' || isValidBrowser());

// Every store value the hooks read.
export const useWallet = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // App and auth
  const isStoreLoaded = useSelector(isReduxStoreLoaded);
  const hasAccount = useSelector(getHasAccount);
  const isVaultUnlocked = useSelector(getIsVaultUnlocked);
  const lastAttempt = useSelector(getLastAttempt);
  const googleAnalyticsKey = useSelector(getGoogleAnalyticsKey);
  const disableMessage = useSelector(getDisableMessage);
  const newsMessage = useSelector(getNewsMessage);
  const isAskedBackup = useSelector(isAskedBackedUpModal);

  // Settings
  const localCurrency = useSelector(getLocalCurrency);
  const lockTime = useSelector(getLockTime);
  const rateLimitCheck = useSelector(isWalletReset);
  const hideSmallTx = useSelector(getHideSmallTransactions);
  const allCustomRPC = useSelector(selectAllCustomRpc);
  const paymentUrlCoin = useSelector(getPaymentUrlCoin);
  const paymentUrlAmount = useSelector(getPaymentUrlAmount);
  const paymentUrlCurrencyAmount = useSelector(getPaymentUrlCurrencyAmount);
  const tutorialVideos = useSelector(getTutorialVideos);

  // Wallets
  const currentWallet = useSelector(selectCurrentWallet);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const masterClientId = useSelector(getMasterClientId);
  const currentPhrase = useSelector(getCurrentWalletPhrase);
  const allWallets = useSelector(selectAllWallets);
  const visibleWallets = useSelector(selectVisibleWallets);
  const allWalletName = useSelector(selectAllWalletName, shallowEqual);
  const isImportWithPrivateKey = useSelector(isImportWalletWithPrivateKey);
  const isBackup = useSelector(selectIsBackedUp);
  const totalAssets = useSelector(countTotalAssets);
  const isAddMoreAddressPopupHide = useSelector(
    getCurrentWalletIsAddMoreAddressPopupHidden,
  );
  const isAdding50more = useSelector(isAdding50MoreAddresses);
  const failedTransaction = useSelector(getFailedTransaction);
  const walletConnectSessions = useSelector(
    selectWalletConnectSessions,
    shallowEqual,
  );
  const walletConnectData = useSelector(selectWalletConnectData, shallowEqual);
  const walletConnectTransactionData = useSelector(
    selectWalletConnectTransactionData,
  );

  // New wallet being created or imported
  const phrase = useSelector(getPhrase);
  const privateKey = useSelector(getPrivateKey);
  const chainName = useSelector(getChainName);

  // Coins
  const currentCoin = useSelector(selectCurrentCoin);
  const allCoins = useSelector(selectCoinsForCurrentWallet, shallowEqual);
  const userCoins = useSelector(selectUserCoins, shallowEqual);
  const coinOptions = useSelector(getUserCoinsOptions, shallowEqual);
  const allCoinsOptions = useSelector(getCoinsOptions, shallowEqual);
  const allNewCoins = useSelector(selectAllNewCoins);
  const currencies = useSelector(selectAllCurrencies, shallowEqual);
  const coinsSortOption = useSelector(selectCurrentWalletSortOption);
  const nativeCoinBalance = useSelector(getBalanceForNativeCoin);
  const reduxRecentTransaction = useSelector(
    selectCurrentCoinRecentTransaction,
  );

  // Coin sync
  const isSyncing = useSelector(selectIsSyncing);
  const syncingWalletClientId = useSelector(selectSyncingWalletClientId);
  const syncingWalletName = useSelector(selectSyncingWalletName);
  const coinSyncStatus = useSelector(selectCoinSyncStatus);
  const coinSyncProgress = useSelector(selectCoinSyncProgress);
  const isCreatingWallets = useSelector(selectIsCreatingWallets);
  const currentSyncingCoin = useSelector(selectCurrentSyncingCoin);
  const coinsWithBalance = useSelector(selectCoinsWithBalance);
  const coinsWithBalanceCount = useSelector(selectCoinsWithBalanceCount);
  const selectedCount = useSelector(selectSelectedCount);

  // Transfer
  const transferData = useSelector(getTransferData);
  const transferDataLoading = useSelector(getTransferDataLoading);
  const transferDataSubmitting = useSelector(getTransferDataSubmitting);
  const feeSuccess = useSelector(getTransferDataFeeSuccess);
  const feesOptions = useSelector(getTransferDataFeesOptions);
  const customError = useSelector(getTransferDataCustomError);
  const updateTransactionData = useSelector(getUpdateTransactionData);
  const sentAddressHistory = useSelector(getSentAddressHistory);
  const routeStateData = useSelector(getRouteStateData);

  // Buy and sell
  const cryptoProviders = useSelector(getCryptoProviders);
  const cryptoProvidersLoading = useSelector(getCryptoProvidersLoading);
  const otcData = useSelector(getOTCData);
  const sellCryptoProviders = useSelector(getSellCryptoProviders);
  const sellCryptoLoading = useSelector(getSellCryptoLoading);
  const sellCryptoError = useSelector(getSellCryptoError);
  const sellCryptoRequestDetails = useSelector(getSellCryptoRequestDetails);

  // Swap
  const exchange = useSelector(getExchange);
  const exchangeProviders = useSelector(getExchangeProviders);
  const isExchangeLoading = useSelector(selectExchangeLoading);
  const exchangeApproveLoading = useSelector(getExchangeApproveLoading);
  const exchangePermitApproveLoading = useSelector(
    getExchangePermitApproveLoading,
  );
  const selectedExchangeChain = useSelector(selectSelectedExchangeChain);
  const selectedFromWallet = useSelector(selectExchangeFromWallet);
  const selectedFromAsset = useSelector(selectExchangeFromAsset);
  const selectedToAsset = useSelector(selectExchangeToAsset);
  const amountFrom = useSelector(selectExchangeAmountFrom);
  const amountTo = useSelector(selectExchangeAmountTo);
  const exchangeToAddress = useSelector(selectExchangeToAddress);
  const exchangeToName = useSelector(selectExchangeToName);
  const isQuoteFetching = useSelector(selectIsQuoteFetching);
  const quoteError = useSelector(selectQuoteError);
  const quoteFetchedAt = useSelector(selectQuoteFetchedAt);
  const providerRows = useSelector(selectProviderRows);
  const lowestPairMinimum = useSelector(selectLowestPairMinimum);

  // Swap history
  const historyTransactions = useSelector(selectExchangeTransactions);
  const historyMeta = useSelector(selectExchangeHistoryMeta);
  const historyLoading = useSelector(selectExchangeHistoryLoading);
  const historyLoadingMore = useSelector(selectExchangeHistoryLoadingMore);
  const historyRefreshing = useSelector(selectExchangeHistoryRefreshing);
  const historyError = useSelector(selectExchangeHistoryError);
  const detailTransaction = useSelector(selectCurrentExchangeTransaction);
  const detailLoading = useSelector(selectExchangeDetailLoading);
  const detailError = useSelector(selectExchangeDetailError);

  // Staking
  const validators = useSelector(getStakingValidatorsByChain, shallowEqual);
  const isStakingLoading = useSelector(getStakingLoading);
  const allowanceLoading = useSelector(getStakingAllowanceLoading);
  const selectedVotes = useSelector(getSelectedVotes);
  const selectedVotesTotal = useSelector(countSelectedVotes);

  const coins = useMemo(
    () => (userCoins || []).filter(isSupportedCoin),
    [userCoins],
  );

  const visibleCoins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q
      ? coins.filter(
          item =>
            item?.name?.toLowerCase().includes(q) ||
            item?.symbol?.toLowerCase().includes(q),
        )
      : coins;
  }, [coins, searchQuery]);

  // Portfolio split by fiat value: the biggest holdings plus "Other", each
  // coin's share for its row, and the value-weighted 24h change.
  const portfolio = useMemo(() => {
    const valued = coins
      .map(item => ({item, value: parseFloat(item?.totalCourse) || 0}))
      .filter(({value}) => value > 0)
      .sort((a, b) => b.value - a.value);
    const total = valued.reduce((sum, {value}) => sum + value, 0);
    const shareById = {};
    let now = 0;
    let before = 0;
    valued.forEach(({item, value}) => {
      shareById[item._id] = total ? (value / total) * 100 : 0;
      const change = Number(item?.priceChange24h);
      if (item?.priceChange24h != null && Number.isFinite(change)) {
        now += value;
        before += value / (1 + change / 100);
      }
    });
    const top = valued.slice(0, ALLOCATION_SLICES).map(({item, value}) => ({
      key: item._id,
      label: item?.symbol,
      share: shareById[item._id],
      value,
    }));
    const rest = valued.slice(ALLOCATION_SLICES);
    if (rest.length) {
      const value = rest.reduce((sum, entry) => sum + entry.value, 0);
      top.push({
        key: 'other',
        label: `Other (${rest.length})`,
        share: (value / total) * 100,
        value,
      });
    }
    return {
      allocation: top,
      shareById,
      change24h: before > 0 ? ((now - before) / before) * 100 : null,
    };
  }, [coins]);

  const coinsNames = useMemo(
    () =>
      (Array.isArray(allNewCoins) ? allNewCoins : [])
        .map(item => item.name)
        .join(', '),
    [allNewCoins],
  );

  const newCoinsMessage =
    coinsNames && !isImportWithPrivateKey
      ? `New ${
          allNewCoins?.length === 1 ? 'cryptocurrency' : 'cryptocurrencies'
        }, such as ${coinsNames} ${
          allNewCoins?.length === 1 ? 'is' : 'are'
        } now accessible.`
      : '';

  const walletName = currentWallet?.walletName || 'Wallet';
  const fiatSymbol = currencySymbol[localCurrency] || '';

  return {
    // App and auth
    isStoreLoaded,
    hasAccount,
    isVaultUnlocked,
    lastAttempt,
    googleAnalyticsKey,
    disableMessage,
    newsMessage,
    isAskedBackup,

    // Settings
    localCurrency,
    lockTime,
    rateLimitCheck,
    hideSmallTx,
    allCustomRPC,
    paymentUrlCoin,
    paymentUrlAmount,
    paymentUrlCurrencyAmount,
    tutorialVideos,

    // Wallets
    currentWallet,
    currentWalletClientId,
    masterClientId,
    currentPhrase,
    allWallets,
    visibleWallets,
    allWalletName,
    isImportWithPrivateKey,
    isBackup,
    totalAssets,
    isAddMoreAddressPopupHide,
    isAdding50more,
    failedTransaction,
    walletConnectSessions,
    walletConnectData,
    walletConnectTransactionData,

    // New wallet being created or imported
    phrase,
    privateKey,
    chainName,

    // Coins
    currentCoin,
    allCoins,
    userCoins,
    coinOptions,
    allCoinsOptions,
    allNewCoins,
    currencies,
    coinsSortOption,
    nativeCoinBalance,
    reduxRecentTransaction,

    // Coin sync
    isSyncing,
    syncingWalletClientId,
    syncingWalletName,
    coinSyncStatus,
    coinSyncProgress,
    isCreatingWallets,
    currentSyncingCoin,
    coinsWithBalance,
    coinsWithBalanceCount,
    selectedCount,

    // Transfer
    transferData,
    transferDataLoading,
    transferDataSubmitting,
    feeSuccess,
    feesOptions,
    customError,
    updateTransactionData,
    sentAddressHistory,
    routeStateData,

    // Buy and sell
    cryptoProviders,
    cryptoProvidersLoading,
    otcData,
    sellCryptoProviders,
    sellCryptoLoading,
    sellCryptoError,
    sellCryptoRequestDetails,

    // Swap
    exchange,
    exchangeProviders,
    isExchangeLoading,
    exchangeApproveLoading,
    exchangePermitApproveLoading,
    selectedExchangeChain,
    selectedFromWallet,
    selectedFromAsset,
    selectedToAsset,
    amountFrom,
    amountTo,
    exchangeToAddress,
    exchangeToName,
    isQuoteFetching,
    quoteError,
    quoteFetchedAt,
    providerRows,
    lowestPairMinimum,

    // Swap history
    historyTransactions,
    historyMeta,
    historyLoading,
    historyLoadingMore,
    historyRefreshing,
    historyError,
    detailTransaction,
    detailLoading,
    detailError,

    // Staking
    validators,
    isStakingLoading,
    allowanceLoading,
    selectedVotes,
    selectedVotesTotal,

    walletName,
    fiatSymbol,
    coins,
    visibleCoins,
    portfolio,
    newCoinsMessage,
    searchQuery,
    onSearchChange: e => setSearchQuery(e.target.value),
    clearSearch: () => setSearchQuery(''),
  };
};

export default useWallet;
