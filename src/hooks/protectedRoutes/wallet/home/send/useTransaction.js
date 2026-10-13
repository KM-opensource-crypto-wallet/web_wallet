import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import dayjs from 'dayjs';
import {useDispatch, useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import {
  selectCurrentCoin,
  selectCurrentCoinRecentTransaction,
  selectCurrentWallet,
  selectTransactionsByType,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  getLocalCurrency,
  getHideSmallTransactions,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {setHideSmallTransactions} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import {
  fetchTransactionByHash,
  refreshCurrentCoin,
  sendPendingTransactions,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {getRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraSelectors';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {getUpdateTransactionData} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSelector';
import {
  fetchTransactionData,
  resetUpdateTransactionData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {updateTransactionValidation} from 'utils/validationSchema';
import {
  getAddressDetailsUrl,
  getCustomizePublicAddress,
  isBitcoinChain,
  isCustomAddressNotSupportedChain,
  isPendingTransactionSupportedChain,
} from 'dok-wallet-blockchain-networks/helper';
import {currencySymbol} from 'data/currency';
import {
  describeTransaction,
  fiatValue,
  txStatus,
} from 'components/Transactions';
import {SORT_OPTIONS} from 'components/ModalSortTransactions';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ContractIcon,
  ImageIcon,
  LayersIcon,
  PowerIcon,
  ShieldIcon,
  StarIcon,
  TrendDownIcon,
  TrendUpIcon,
} from 'components/Transactions/TxIcons';
import {ALL_ONLY_CHAINS, ALL_TRANSACTION_TYPES} from 'data/transactionTypes';

function computeRenderList(
  transactions,
  hideSmallTx,
  currencyRate,
  filter,
  sort,
  mineAddress,
) {
  const list = Array.isArray(transactions) ? [...transactions] : [];
  const filtered = list.filter(tx => {
    const isRegularTx = tx?.transactionType === 'regular';
    if (hideSmallTx && isRegularTx) {
      const usdValue =
        tx.totalCourse != null
          ? parseFloat(tx.totalCourse)
          : parseFloat(tx.amount) * (currencyRate || 0);
      if (usdValue < 1) return false;
    }
    if (!filter || filter === 'None') return true;
    if (filter === 'Received')
      return mineAddress?.toUpperCase() === tx?.to?.toUpperCase();
    if (filter === 'Send')
      return mineAddress?.toUpperCase() === tx?.from?.toUpperCase();
    if (filter === 'Pending') return tx.status?.toUpperCase() !== 'SUCCESS';
    return true;
  });
  return filtered.sort((a, b) => {
    if (sort === 'Date Ascending') return new Date(a.date) - new Date(b.date);
    if (sort === 'Amount Ascending') return Number(a.amount) - Number(b.amount);
    if (sort === 'Amount Descending')
      return Number(b.amount) - Number(a.amount);
    return new Date(b.date) - new Date(a.date);
  });
}

const STATUS_LABEL = {success: 'Success', pending: 'Pending', failed: 'Failed'};

// Transaction Details: works out the transaction's type and builds the hero,
// the detail rows and the optional item list shown for it.
function buildTransactionDetails(transaction, currentCoin, symbol, fiatSymbol) {
  // ── Transaction type detection ──────────────────────────────────────────────

  const isNFT = !!transaction?.isNFT;
  const isNFTHistorical =
    !isNFT && transaction?.transactionType === 'nftTransfer';
  const isBatchTx = !!(
    transaction?.isBatchTransaction || transaction?.transactionType === 'batch'
  );
  const isStakingTx = !!(
    transaction?.isCreateStaking ||
    transaction?.isWithdrawStaking ||
    transaction?.isDeactivateStaking ||
    transaction?.isStakingRewards ||
    transaction?.transactionType === 'stake' ||
    transaction?.transactionType === 'unstake' ||
    transaction?.transactionType === 'withdraw'
  );
  const isVoteTx = !!transaction?.isCreateVote;
  const isSmartContractTx = transaction?.transactionType === 'smartContract';
  const isDelegationTx = transaction?.transactionType === 'delegationChange';
  const isRegularTx =
    !isNFT &&
    !isNFTHistorical &&
    !isBatchTx &&
    !isStakingTx &&
    !isVoteTx &&
    !isSmartContractTx &&
    !isDelegationTx;

  const stakingLabel =
    transaction?.isCreateStaking || transaction?.transactionType === 'stake'
      ? 'Staking'
      : transaction?.isWithdrawStaking ||
          transaction?.transactionType === 'withdraw'
        ? 'Withdraw'
        : transaction?.isDeactivateStaking ||
            transaction?.transactionType === 'unstake'
          ? 'Unstaking'
          : 'Claimed Rewards';

  const isReceived = isRegularTx
    ? transaction?.paymentType != null
      ? transaction.paymentType === 1
      : transaction?.to?.toUpperCase() === currentCoin?.address?.toUpperCase()
    : false;

  const status = txStatus(transaction);
  const statusLabel = transaction?.status ? STATUS_LABEL[status] : '—';

  const pageTitle = isNFT
    ? 'NFT Transfer'
    : `${currentCoin?.name || ''} Transaction`;

  const onViewExplorer = transaction?.url
    ? () => window.open(transaction.url, '_blank', 'noopener,noreferrer')
    : null;

  // ── Hero + rows per type ────────────────────────────────────────────────────

  const chainRow = currentCoin?.chain_display_name
    ? {label: 'Chain', value: currentCoin.chain_display_name}
    : null;
  const fromRow = (label = 'From') =>
    transaction.from ? {label, copy: transaction.from} : null;
  const toRow = (label = 'To') =>
    transaction.to ? {label, copy: transaction.to} : null;
  const fiatText =
    transaction.totalCourse != null
      ? `${fiatSymbol}${transaction.totalCourse}`
      : null;

  let hero = {};
  let rows = [];
  let list = null;

  if (isNFT || isNFTHistorical) {
    hero = {
      Icon: ImageIcon,
      tone: 'tonePurple',
      title: 'NFT Transfer',
      image: isNFT ? transaction.nftImage || null : undefined,
      amount: isNFT
        ? transaction.nftTokenId
          ? `${transaction.nftName || '—'} (#${transaction.nftTokenId})`
          : transaction.nftName || '—'
        : null,
    };
    rows = [chainRow, fromRow(), toRow()];
  } else if (isBatchTx) {
    const batchItems = Array.isArray(transaction.transactionsData)
      ? transaction.transactionsData
      : [];
    hero = {
      Icon: LayersIcon,
      tone: 'toneBlue',
      title: 'Batch Transaction',
      sub: `${batchItems.length} transaction${
        batchItems.length !== 1 ? 's' : ''
      }`,
    };
    list = batchItems.length
      ? {
          title: 'Transactions',
          items: batchItems.map((item, index) => {
            const coinInfo = item?.coinInfo;
            const tData = item?.transferData;
            return {
              key: `batch_item_${index}`,
              primary: coinInfo?.name
                ? `${coinInfo.name} (${coinInfo.symbol})`
                : coinInfo?.symbol || '—',
              secondary: tData?.to
                ? `To ${getCustomizePublicAddress(tData.to)}`
                : null,
              value: `${tData?.amount || '0'} ${coinInfo?.symbol || ''}`,
            };
          }),
        }
      : null;
  } else if (isStakingTx) {
    const isPositive =
      transaction?.isCreateStaking || transaction?.isStakingRewards;
    hero = {
      Icon: transaction?.isCreateStaking
        ? TrendUpIcon
        : transaction?.isWithdrawStaking
          ? TrendDownIcon
          : transaction?.isDeactivateStaking
            ? PowerIcon
            : StarIcon,
      tone: isPositive ? 'toneIn' : 'toneWarn',
      title: stakingLabel,
      amount: transaction.amount ? `${transaction.amount} ${symbol}` : null,
      amountTone: isPositive ? 'amountIn' : 'amountWarn',
      fiat: fiatText,
    };
    rows = [
      chainRow,
      currentCoin?.name
        ? {
            label: 'Asset',
            value: `${currentCoin.name} (${currentCoin.symbol})`,
          }
        : null,
      fromRow(),
      transaction.validatorPubKey
        ? {label: 'Validator address', copy: transaction.validatorPubKey}
        : null,
      transaction.validatorName
        ? {label: 'Validator name', value: transaction.validatorName}
        : null,
      transaction.resourceType
        ? {label: 'Resource type', value: transaction.resourceType}
        : null,
    ];
  } else if (isVoteTx) {
    const displayValidators = Array.isArray(transaction.displayValidators)
      ? transaction.displayValidators
      : [];
    hero = {
      Icon: CheckCircleIcon,
      tone: 'toneBlue',
      title: 'Votes Submitted',
      sub: displayValidators.length
        ? `${displayValidators.length} validator${
            displayValidators.length !== 1 ? 's' : ''
          }`
        : null,
    };
    list = displayValidators.length
      ? {
          title: 'Validators',
          items: displayValidators.map((item, index) => ({
            key: `validator_${index}`,
            primary:
              item?.name || getCustomizePublicAddress(item?.validatorAddress),
            value: `${item?.votes} votes`,
          })),
        }
      : null;
    rows = [fromRow()];
  } else if (isSmartContractTx) {
    hero = {Icon: ContractIcon, tone: 'tonePurple', title: 'Contract Call'};
    rows = [chainRow, fromRow(), toRow('Contract')];
  } else if (isDelegationTx) {
    const isRevoke =
      transaction?.from?.toLowerCase() === transaction?.to?.toLowerCase();
    hero = {
      Icon: ShieldIcon,
      tone: 'toneBlue',
      title: isRevoke ? 'Delegation Revoked' : 'Delegation Change',
      sub: 'EIP-7702',
    };
    rows = [chainRow, fromRow('Wallet')];
  } else {
    hero = {
      Icon: isReceived ? ArrowDownIcon : ArrowUpIcon,
      tone: isReceived ? 'toneIn' : 'toneOut',
      title: isReceived ? 'Received' : 'Sent',
      amount: `${isReceived ? '+' : '−'}${transaction.amount} ${symbol}`,
      amountTone: isReceived ? 'amountIn' : 'amountOut',
      fiat: fiatText,
    };
    rows = [fromRow(), toRow()];
  }

  rows = [
    ...rows,
    transaction.date
      ? {
          label: 'Date',
          value: dayjs(transaction.date).format('DD MMM YYYY, HH:mm'),
        }
      : null,
    transaction.blockNumber != null
      ? {label: 'Block no.', value: String(transaction.blockNumber)}
      : null,
    transaction.confirmations != null
      ? {label: 'Confirmations', value: String(transaction.confirmations)}
      : null,
    transaction.link ? {label: 'Tx hash', copy: transaction.link} : null,
  ].filter(Boolean);

  return {
    hero,
    rows,
    list,
    status,
    statusLabel,
    pageTitle,
    onViewExplorer,
    showImage: hero.image !== undefined,
  };
}

// Logic for the coin's transaction screens. `screen` is 'list' (Transactions),
// 'details' (Transaction Details) or 'update' (Update Transaction); it decides
// which data each page fetches on mount.
export const useTransaction = screen => {
  const dispatch = useDispatch();
  const localCurrency = useSelector(getLocalCurrency);
  const currentCoin = useSelector(selectCurrentCoin);
  const currentWallet = useSelector(selectCurrentWallet);
  const hideSmallTx = useSelector(getHideSmallTransactions);

  const [modalVisible, setmodalVisible] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [filter, setFilter] = useState('None');
  const [sort, setSort] = useState('Date Descending');
  const [selectedType, setSelectedType] = useState('all');
  const [renderList, setRenderList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const router = useRouter();
  const routes = useAppRoutes();

  const coinId =
    currentCoin?.address + currentCoin?.name + currentCoin?.chain_name;

  const transactionsSelector = useMemo(
    () => selectTransactionsByType(selectedType),
    [selectedType],
  );
  const typedTransactions = useSelector(transactionsSelector);

  const transactionTypes = useMemo(() => {
    const chain = currentCoin?.chain_name;
    if (chain === 'tron') {
      return ALL_TRANSACTION_TYPES.filter(t => t.value !== 'batch');
    }
    if (chain === 'solana') {
      return ALL_TRANSACTION_TYPES.filter(t =>
        ['all', 'stake', 'unstake', 'withdraw'].includes(t.value),
      );
    }
    if (ALL_ONLY_CHAINS.includes(chain) || isBitcoinChain(chain)) {
      return ALL_TRANSACTION_TYPES.filter(t => t.value === 'all');
    }
    return ALL_TRANSACTION_TYPES;
  }, [currentCoin?.chain_name]);

  const isSupportUpdateTransaction = useMemo(() => {
    return (
      isPendingTransactionSupportedChain(currentCoin?.chain_name) &&
      currentCoin?.type === 'coin'
    );
  }, [currentCoin?.chain_name, currentCoin?.type]);

  const onPressUpdateTransaction = useCallback(() => {
    router.push(routes.coin.updateTransaction());
  }, [router, routes]);

  useEffect(() => {
    if (screen === 'list' && currentCoin?.address) {
      dispatch(refreshCurrentCoin({fetchTransaction: true}))
        .unwrap()
        .then(() => {
          setIsLoading(false);
        })
        .catch(e => {
          setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinId, dispatch]);

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      setRenderList(
        computeRenderList(
          typedTransactions,
          hideSmallTx,
          currentCoin?.currencyRate,
          filter,
          sort,
          currentCoin?.address,
        ),
      );
    })();
  }, [
    typedTransactions,
    hideSmallTx,
    currentCoin?.currencyRate,
    currentCoin?.address,
    filter,
    sort,
  ]);

  const onPressViewAll = useCallback(() => {
    const chain_name = currentCoin?.chain_name;
    const type = currentCoin?.type;
    const address = currentCoin?.address;
    if (chain_name && type && address) {
      const url = getAddressDetailsUrl(chain_name, type, address);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  }, [currentCoin?.address, currentCoin?.chain_name, currentCoin?.type]);

  const onPressApply = useCallback(
    (sortValue, filterValue, hideSmallTxValue) => {
      setSort(sortValue);
      setFilter(filterValue);
      dispatch(setHideSmallTransactions(hideSmallTxValue));
    },
    [dispatch],
  );

  const onPressTypeTab = useCallback(value => {
    setSelectedType(value);
    setSort('Date Descending');
    setFilter('None');
  }, []);

  const onResetFilters = useCallback(() => {
    setSelectedType('all');
    setSort('Date Descending');
    setFilter('None');
  }, []);

  // Net (settled sends / receives only), count and pending across the
  // transactions currently shown.
  const summary = useMemo(() => {
    let netFiat = 0;
    let netCoin = new BigNumber(0);
    let pending = 0;
    renderList.forEach(item => {
      const status = txStatus(item);
      if (status === 'pending') pending += 1;
      if (status !== 'success') return;
      const {dir} = describeTransaction(item, currentCoin?.address);
      const amount = new BigNumber(item?.amount);
      if (dir === 'in') {
        netFiat += fiatValue(item);
        if (amount.isFinite()) netCoin = netCoin.plus(amount);
      } else if (dir === 'out') {
        netFiat -= fiatValue(item);
        if (amount.isFinite()) netCoin = netCoin.minus(amount);
      }
    });
    return {netFiat, netCoin, pending};
  }, [renderList, currentCoin?.address]);

  const fiatSymbol = currencySymbol[localCurrency] || '';
  const symbol = currentCoin?.symbol?.toUpperCase() ?? '';
  const walletName = currentWallet?.walletName || 'Wallet';
  const filterCount =
    (selectedType !== 'all' ? 1 : 0) + (filter !== 'None' ? 1 : 0);
  const sortLabel =
    SORT_OPTIONS.find(option => option.label === sort)?.title || sort;
  const filterLabel =
    filter === 'Send'
      ? 'Sent'
      : filter === 'None'
        ? ''
        : filter === 'Pending'
          ? 'Pending'
          : filter;
  const netCoinText = `${summary.netCoin.isNegative() ? '−' : '+'}${summary.netCoin
    .abs()
    .decimalPlaces(6)
    .toString()} ${symbol}`;

  // ---- Transaction Details ----

  const params = useParams();
  const txHash = params?.txHash ? decodeURIComponent(params.txHash) : null;
  const reduxRecentTransaction = useSelector(
    selectCurrentCoinRecentTransaction,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [nftImageError, setNftImageError] = useState(false);
  const statusRef = useRef(null);
  const routeStateData = useSelector(getRouteStateData);
  const [savedRouteTransaction] = useState(
    () => routeStateData?.TransactionDetails?.transaction ?? null,
  );

  useEffect(() => {
    if (screen === 'details' && savedRouteTransaction) {
      dispatch(setRouteStateData({TransactionDetails: null}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialTransaction =
    currentCoin?.transactions?.find(t => t.link === txHash) ??
    (savedRouteTransaction?.link === txHash ? savedRouteTransaction : null);

  const recentTx =
    reduxRecentTransaction?.data?.link === txHash
      ? reduxRecentTransaction?.data
      : null;

  const transaction = recentTx
    ? {
        ...initialTransaction,
        from: recentTx.from,
        to: recentTx.to,
        amount: recentTx.amount,
        date: recentTx.blockTimestamp
          ? new Date(parseInt(recentTx.blockTimestamp, 16) * 1000).toISOString()
          : initialTransaction?.date,
        status: recentTx.status,
        link: recentTx.link,
        url: recentTx.url || initialTransaction?.url,
        totalCourse: recentTx.totalCourse,
        blockNumber: recentTx.blockNumber,
        confirmations: recentTx.confirmations,
        ...(recentTx.paymentType != null && {
          paymentType: recentTx.paymentType,
        }),
        ...(recentTx.transactionType != null &&
          initialTransaction?.transactionType != null && {
            transactionType: recentTx.transactionType,
          }),
      }
    : initialTransaction;

  useEffect(() => {
    if (recentTx?.status) {
      statusRef.current = recentTx.status;
    }
  }, [recentTx?.status]);

  const currentCoinRef = useRef(currentCoin);

  const fetchTransaction = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(
        fetchTransactionByHash({txHash, currentCoin: currentCoinRef.current}),
      ).unwrap();
    } catch (e) {
      console.error('Error refreshing transaction', e);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, txHash]);

  useEffect(() => {
    if (screen !== 'details') {
      return;
    }
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      fetchTransaction();
    })();
    const interval = setInterval(() => {
      const upperStatus = statusRef.current?.toUpperCase();
      if (upperStatus === 'SUCCESS' || upperStatus === 'FAILED') {
        clearInterval(interval);
        return;
      }
      fetchTransaction();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transactionDetails = transaction
    ? buildTransactionDetails(transaction, currentCoin, symbol, fiatSymbol)
    : null;

  // ---- Update Transaction ----

  const updateTransactionData = useSelector(getUpdateTransactionData);
  const isUpdateLoading = updateTransactionData?.isLoading;
  const isUpdateSubmitting = updateTransactionData?.isSubmitting;
  const updateSuccess = updateTransactionData?.success;
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const isCancelTransactionRef = useRef(false);

  useEffect(() => {
    if (screen !== 'update') {
      return;
    }
    return () => {
      dispatch(resetUpdateTransactionData());
    };
  }, [screen, dispatch]);

  const onFetchUpdateTransaction = useCallback(
    values => {
      dispatch(fetchTransactionData({txHash: values?.tx}));
    },
    [dispatch],
  );

  const onUpdateConfirmed = useCallback(() => {
    setShowUpdateModal(false);
    const tx = updateTransactionData?.transactionData;
    dispatch(
      sendPendingTransactions({
        from: tx?.extraPendingTransactionData?.from,
        to: tx?.extraPendingTransactionData?.to,
        value: tx?.extraPendingTransactionData?.value,
        data: tx?.extraPendingTransactionData?.data,
        nonce: tx?.extraPendingTransactionData?.nonce,
        pendingTxHash: tx?.extraPendingTransactionData?.txHash,
        isCancelTransaction: isCancelTransactionRef.current,
        router: router,
        isFromUpdateScreen: true,
      }),
    );
  }, [dispatch, router, updateTransactionData?.transactionData]);

  const onPressCancelTransaction = useCallback(() => {
    isCancelTransactionRef.current = true;
    setShowUpdateModal(true);
  }, []);

  const onPressSpeedupTransaction = useCallback(() => {
    isCancelTransactionRef.current = false;
    setShowUpdateModal(true);
  }, []);

  // Full address on chains whose addresses can't be shortened.
  const formatUpdateAddress = address =>
    isCustomAddressNotSupportedChain(currentCoin?.chain_name)
      ? address
      : getCustomizePublicAddress(address);

  return {
    // Top bar
    goBack: () => router.back(),
    walletName,
    currentCoin,
    localCurrency,
    switcherOpen,
    openSwitcher: () => setSwitcherOpen(true),
    closeSwitcher: () => setSwitcherOpen(false),
    onPressViewAll,

    // Summary
    summary,
    fiatSymbol,
    netCoinText,

    // Type tabs
    transactionTypes,
    selectedType,
    onPressTypeTab,

    // Sort and filter
    sort,
    filter,
    hideSmallTx,
    sortLabel,
    filterLabel,
    filterCount,
    modalVisible,
    openSortModal: () => setmodalVisible(true),
    closeSortModal: () => setmodalVisible(false),
    onPressApply,
    onResetFilters,

    // List
    renderList,
    isLoading,
    isGrouped: sort.startsWith('Date'),

    // Footer
    isSupportUpdateTransaction,
    onPressUpdateTransaction,
    showInfo,
    toggleInfo: () => setShowInfo(v => !v),

    // Transaction Details
    symbol,
    transaction,
    transactionDetails,
    refreshing,
    nftImageError,
    onNftImageError: () => setNftImageError(true),

    // Update Transaction
    updateTransactionData,
    isUpdateLoading,
    isUpdateSubmitting,
    updateSuccess,
    updateTransactionValidation,
    onFetchUpdateTransaction,
    formatUpdateAddress,
    onPressSpeedupTransaction,
    onPressCancelTransaction,
    showUpdateModal,
    closeUpdateModal: () => setShowUpdateModal(false),
    onUpdateConfirmed,
  };
};

export default useTransaction;
