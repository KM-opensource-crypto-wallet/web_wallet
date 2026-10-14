import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useDispatch} from 'react-redux';
import {coinRoutes, walletRoutes} from 'utils/routes';
import {currencySymbol} from 'src/data/lists/currency';
import {HOME_ACTIONS} from 'src/data/lists/homeActions';
import {getCoinSlug, isValidBrowser} from 'utils/common';
import {validateSupportedChain} from 'dok-wallet-blockchain-networks/helper';
import {
  setCurrentCoin,
  sortCurrentWalletCoins,
  syncCoinsWithServer,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  setIsAskedBackupModal,
  setNewCoins,
  setNewsMessage,
  setNewsModalVisible,
} from 'dok-wallet-blockchain-networks/redux/currency/currencySlice';
import {MASK} from 'components/Home/AssetRow';
import {formatMoney} from 'components/Home/WalletSwitcher';
import useWallet from 'src/hooks/wallet/useWallet';
import {HIDE_BALANCES_KEY} from 'src/data/constants';

// Per-browser preference: show balances as dots.
export const readHideBalances = () => {
  try {
    return window.localStorage.getItem(HIDE_BALANCES_KEY) === '1';
  } catch {
    return false;
  }
};

export const writeHideBalances = hidden => {
  try {
    window.localStorage.setItem(HIDE_BALANCES_KEY, hidden ? '1' : '0');
  } catch {
    // Storage unavailable: the choice lasts for this visit only.
  }
};

export const useHome = () => {
  const {clientId} = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // 'send' | 'receive' while the coin picker is open.
  const [pickerMode, setPickerMode] = useState(null);
  const [hidden, setHidden] = useState(readHideBalances);
  const sortButtonRef = useRef(null);

  const {
    userCoins,
    localCurrency,
    totalAssets,
    allNewCoins,
    isBackup,
    currentWallet,
    isAskedBackup,
    isImportWithPrivateKey,
    newsMessage,
    coinsSortOption,
    cryptoProviders: buyProviders,
    exchangeProviders: swapProviders,
  } = useWallet();

  useEffect(() => {
    if (!isBackup && !isAskedBackup[currentWallet?.walletName]) {
      setTimeout(() => setBackupModalVisible(true), 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coins this browser can show (same rules as the old list rows).
  const coins = useMemo(
    () =>
      (userCoins || []).filter(
        item =>
          validateSupportedChain(item?.chain_name) &&
          (item?.chain_name !== 'thorchain' || isValidBrowser()),
      ),
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

  const toggleHidden = () => {
    const next = !hidden;
    setHidden(next);
    writeHideBalances(next);
  };

  const handleSortApply = useCallback(
    option => dispatch(sortCurrentWalletCoins({sortOption: option})),
    [dispatch],
  );

  const openCoin = useCallback(
    (item, route = coinRoutes.send) => {
      dispatch(setCurrentCoin(item?._id));
      router.push(route(clientId, getCoinSlug(item)));
    },
    [dispatch, router, clientId],
  );

  const onPickFromPicker = item => {
    const mode = pickerMode;
    setPickerMode(null);
    openCoin(
      item,
      mode === 'receive' ? coinRoutes.receiveFunds : coinRoutes.sendFunds,
    );
  };

  // A null handler hides the action.
  const actionHandlers = {
    send: () => setPickerMode('send'),
    receive: () => setPickerMode('receive'),
    buy: buyProviders?.length
      ? () => router.push(walletRoutes.buyCrypto(clientId))
      : null,
    swap: swapProviders?.length
      ? () => router.push(walletRoutes.swap(clientId))
      : null,
  };
  const actions = HOME_ACTIONS.filter(({key}) => actionHandlers[key]).map(
    action => ({...action, onClick: actionHandlers[action.key]}),
  );

  const walletName = currentWallet?.walletName || 'Wallet';
  const symbol = currencySymbol[localCurrency] || '';

  return {
    // Wallet switcher
    walletName,
    switcherOpen,
    openSwitcher: () => setSwitcherOpen(true),
    closeSwitcher: () => setSwitcherOpen(false),

    // Notices
    showNews: !!newsMessage,
    openNews: () => dispatch(setNewsModalVisible(true)),
    dismissNews: () => dispatch(setNewsMessage('')),
    newCoinsMessage,
    syncNewCoins: () => {
      dispatch(setNewCoins([]));
      dispatch(syncCoinsWithServer());
    },
    dismissNewCoins: () => dispatch(setNewCoins([])),

    // Balance card
    hidden,
    toggleHidden,
    balanceText: hidden ? MASK : formatMoney(totalAssets, symbol),
    actions,

    // Search and sort
    searchQuery,
    onSearchChange: e => setSearchQuery(e.target.value),
    clearSearch: () => setSearchQuery(''),
    sortButtonRef,
    sortMenuVisible,
    toggleSortMenu: () => setSortMenuVisible(prev => !prev),
    closeSortMenu: () => setSortMenuVisible(false),
    handleSortApply,
    coinsSortOption,

    // Assets
    coins,
    visibleCoins,
    localCurrency,
    openCoin,
    goToManageCoins: () => router.push(walletRoutes.manageCoins(clientId)),

    // Coin picker (send / receive)
    pickerMode,
    closePicker: () => setPickerMode(null),
    onPickFromPicker,

    // Backup reminder
    backupModalVisible,
    closeBackupModal: () => {
      setBackupModalVisible(false);
      dispatch(setIsAskedBackupModal(currentWallet?.walletName));
    },
  };
};

export default useHome;
