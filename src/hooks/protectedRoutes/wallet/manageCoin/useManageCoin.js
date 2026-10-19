import {useCallback, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';
import {addOrToggleCoinInWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import useWallet, {isSupportedCoin} from 'src/hooks/wallet/useWallet';

const isZeroBalance = item =>
  !(Number(item?.totalAmount ?? item?.totalBalance) > 0);

// Logic for the Manage coins screen.
export const useManageCoin = () => {
  const dispatch = useDispatch();
  const {allCoins, localCurrency, walletName} = useWallet();

  const [modalAddCoinsVisible, setModalAddCoinsVisible] = useState(false);
  const [modalAddTokenVisible, setModalAddTokenVisible] = useState(false);
  const [isSortSelected, setIsSortSelected] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const coins = useMemo(
    () => (Array.isArray(allCoins) ? allCoins.filter(isSupportedCoin) : []),
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
    hasVisibleCoins: list.some(isSupportedCoin),

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
