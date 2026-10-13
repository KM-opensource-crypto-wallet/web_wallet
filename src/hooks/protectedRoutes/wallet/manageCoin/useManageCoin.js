import {useCallback, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {
  selectCoinsForCurrentWallet,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {addOrToggleCoinInWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {validateSupportedChain} from 'dok-wallet-blockchain-networks/helper';
import {isValidBrowser} from 'utils/common';

const isShownHere = item =>
  validateSupportedChain(item?.chain_name) &&
  (item?.chain_name !== 'thorchain' || isValidBrowser());

const isZeroBalance = item =>
  !(Number(item?.totalAmount ?? item?.totalBalance) > 0);

// Logic for the Manage coins screen.
export const useManageCoin = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const allCoins = useSelector(selectCoinsForCurrentWallet, shallowEqual);
  const currentWallet = useSelector(selectCurrentWallet);
  const localCurrency = useSelector(getLocalCurrency);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalAddCoinsVisible, setModalAddCoinsVisible] = useState(false);
  const [modalAddTokenVisible, setModalAddTokenVisible] = useState(false);
  const [isSortSelected, setIsSortSelected] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const coins = useMemo(
    () => (Array.isArray(allCoins) ? allCoins.filter(isShownHere) : []),
    [allCoins],
  );

  const query = searchQuery.trim().toLowerCase();
  // Without a search the full wallet list goes down unfiltered: reordering
  // replaces the wallet's coin array and moves by index into it, so dropping
  // unsupported coins here would delete them. Rows hide those themselves.
  const list = useMemo(
    () =>
      query
        ? coins.filter(
            item =>
              item?.name?.toLowerCase()?.includes(query) ||
              item?.symbol?.toLowerCase()?.includes(query) ||
              item?.chain_display_name?.toLowerCase()?.includes(query),
          )
        : Array.isArray(allCoins)
          ? allCoins
          : [],
    [allCoins, coins, query],
  );

  const shownCount = coins.filter(item => item?.isInWallet).length;
  const hiddenCount = coins.length - shownCount;
  const walletName = currentWallet?.walletName || 'Wallet';
  // Reordering works on the full list only.
  const sorting = isSortSelected && !query;

  // Toggling a coin already in the wallet only flips isInWallet.
  const showAll = useCallback(() => {
    setMenuOpen(false);
    coins
      .filter(item => !item?.isInWallet)
      .forEach(item => dispatch(addOrToggleCoinInWallet(item)));
  }, [coins, dispatch]);

  const hideZeroBalances = useCallback(() => {
    setMenuOpen(false);
    coins
      .filter(item => item?.isInWallet && isZeroBalance(item))
      .forEach(item => dispatch(addOrToggleCoinInWallet(item)));
  }, [coins, dispatch]);

  return {
    // Top bar
    goBack: () => router.back(),
    walletName,
    switcherOpen,
    openSwitcher: () => setSwitcherOpen(true),
    closeSwitcher: () => setSwitcherOpen(false),
    localCurrency,

    // More menu
    menuOpen,
    toggleMenu: () => setMenuOpen(v => !v),
    closeMenu: () => setMenuOpen(false),
    hideZeroBalances,
    showAll,
    startReorder: () => {
      setMenuOpen(false);
      setSearchQuery('');
      setIsSortSelected(true);
    },

    // Reordering
    sorting,
    finishReorder: () => setIsSortSelected(false),

    // Search and counts
    searchQuery,
    onSearchChange: event => setSearchQuery(event.target.value),
    clearSearch: () => setSearchQuery(''),
    shownCount,
    hiddenCount,

    // List
    list,
    hasVisibleCoins: list.some(isShownHere),

    // Add coin / token modals
    modalAddCoinsVisible,
    setModalAddCoinsVisible,
    openAddCoins: () => setModalAddCoinsVisible(true),
    modalAddTokenVisible,
    setModalAddTokenVisible,
    openAddToken: () => setModalAddTokenVisible(true),
  };
};

export default useManageCoin;
