'use client';
import React, {useState, useMemo, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import s from './ManageCoins.module.css';
import ModalAddCoins from 'components/ModalAddCoins';
import ModalAddToken from 'components/ModalAddToken';
import {
  selectCoinsForCurrentWallet,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {addOrToggleCoinInWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {validateSupportedChain} from 'dok-wallet-blockchain-networks/helper';
import {isValidBrowser} from 'utils/common';
import DraggableCryptoList from 'components/DraggableCryptoList';
import GeneralButton from 'components/Button';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/useHome';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  PlusIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';

const MoreIcon = () => (
  <svg width='20' height='20' viewBox='0 0 24 24' aria-hidden='true'>
    <circle cx='5' cy='12' r='2' style={{fill: 'currentColor'}} />
    <circle cx='12' cy='12' r='2' style={{fill: 'currentColor'}} />
    <circle cx='19' cy='12' r='2' style={{fill: 'currentColor'}} />
  </svg>
);

const isShownHere = item =>
  validateSupportedChain(item?.chain_name) &&
  (item?.chain_name !== 'thorchain' || isValidBrowser());

const isZeroBalance = item =>
  !(Number(item?.totalAmount ?? item?.totalBalance) > 0);

const ManageCoins = () => {
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

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <GeneralButton
          variant='unstyled'
          className={s.heading}
          aria-haspopup='dialog'
          onClick={() => setSwitcherOpen(true)}>
          <h1 className={s.headingTitle}>Manage coins</h1>
          <span className={s.headingSub}>
            <span className={s.walletAvatar}>
              {walletName[0].toUpperCase()}
            </span>
            <span className={s.headingSubText}>{walletName}</span>
            <ChevronDownIcon size={12} className={s.headingChevron} />
          </span>
        </GeneralButton>
        <div className={s.menuWrap}>
          <GeneralButton
            variant='unstyled'
            className={s.iconButton}
            aria-label='More'
            aria-haspopup='menu'
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}>
            <MoreIcon />
          </GeneralButton>
          {menuOpen ? (
            <>
              <button
                type='button'
                className={s.menuBackdrop}
                aria-label='Close menu'
                onClick={() => setMenuOpen(false)}
              />
              <div className={s.menu} role='menu'>
                <button
                  type='button'
                  role='menuitem'
                  className={s.menuItem}
                  onClick={hideZeroBalances}>
                  Hide zero balances
                </button>
                <button
                  type='button'
                  role='menuitem'
                  className={s.menuItem}
                  onClick={showAll}>
                  Show all coins
                </button>
                <button
                  type='button'
                  role='menuitem'
                  className={s.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    setSearchQuery('');
                    setIsSortSelected(true);
                  }}>
                  Reorder coins
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className={s.column}>
        {sorting ? (
          <div className={s.sortBanner}>
            <span>Drag a coin, or use the arrows, to change its place.</span>
            <button
              type='button'
              className={s.sortDone}
              onClick={() => setIsSortSelected(false)}>
              Done
            </button>
          </div>
        ) : (
          <>
            <label className={s.search}>
              <SearchIcon size={18} />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder='Search coins in this wallet'
                aria-label='Search coins'
              />
              {searchQuery ? (
                <button
                  type='button'
                  className={s.clear}
                  aria-label='Clear search'
                  onClick={() => setSearchQuery('')}>
                  <CloseIcon size={12} />
                </button>
              ) : null}
            </label>
            <div className={s.counts}>
              <span>
                {shownCount} shown on Home · {hiddenCount} hidden
              </span>
              {hiddenCount ? (
                <button type='button' className={s.showAll} onClick={showAll}>
                  Show all
                </button>
              ) : null}
            </div>
          </>
        )}

        <section className={s.card} aria-label='Coins'>
          {list.some(isShownHere) ? (
            <DraggableCryptoList list={list} isSortSelected={sorting} />
          ) : (
            <div className={s.empty}>
              <p className={s.emptyTitle}>No coins found</p>
              <p className={s.emptyText}>Try a different name or symbol</p>
            </div>
          )}
        </section>

        {!sorting ? (
          <div className={s.addDock}>
            <section className={s.card} aria-label='Add coins'>
              <button
                type='button'
                className={s.addRow}
                onClick={() => setModalAddCoinsVisible(true)}>
                <span className={s.addIcon}>
                  <PlusIcon size={17} />
                </span>
                <span className={s.addText}>
                  <span className={s.addTitle}>Add coin or token</span>
                  <span className={s.addHint}>
                    Select from the supported list
                  </span>
                </span>
                <ChevronRightIcon size={16} className={s.addChevron} />
              </button>
              <button
                type='button'
                className={s.addRow}
                onClick={() => setModalAddTokenVisible(true)}>
                <span className={`${s.addIcon} ${s.addIconAccent}`}>
                  <PlusIcon size={17} />
                </span>
                <span className={s.addText}>
                  <span className={s.addTitle}>Add custom token</span>
                  <span className={s.addHint}>Any ERC20 / BEP20 contract</span>
                </span>
                <ChevronRightIcon size={16} className={s.addChevron} />
              </button>
            </section>
          </div>
        ) : null}
      </div>

      {modalAddCoinsVisible && (
        <ModalAddCoins
          visible={modalAddCoinsVisible}
          hideModal={setModalAddCoinsVisible}
        />
      )}
      <ModalAddToken
        visible={modalAddTokenVisible}
        hideModal={setModalAddTokenVisible}
      />
      <WalletSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
    </main>
  );
};

export default ManageCoins;
