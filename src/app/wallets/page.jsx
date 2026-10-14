'use client';

import {walletRoutes} from 'utils/routes';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  isWalletHiddenAndLocked,
  selectAllWallets,
  selectCurrentWallet,
  selectRefreshingWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  findHiddenWalletByCode,
  rearrangeWallet,
  refreshCoins,
  setCurrentWalletClientId,
  setWalletRevealed,
  sortWallets,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  getLocalCurrency,
  getWalletsSortOption,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  resetPaymentUrl,
  setWalletsSortOption,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import Image from 'next/image';
import s from './Wallets.module.css';
import {useRouter} from 'next/navigation';
import ModalCreateWallet from 'components/ModalCreateWallet';
import RefreshWalletsButton from 'components/RefreshWalletsButton';
import {debounce, moveItem} from 'dok-wallet-blockchain-networks/helper';
import {
  normalizeSecretCode,
  SECRET_CODE_MAX_LENGTH,
  SECRET_CODE_MIN_LENGTH,
} from 'utils/hideWallet';
import {store} from 'redux/store';
import {closestCenter, DndContext} from '@dnd-kit/core';
import {restrictToParentElement} from '@dnd-kit/modifiers';
import {SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import SortableItem from 'components/Sortable/sortable';
import {currencySymbol} from 'src/data/lists/currency';
import GeneralButton from 'components/Button';
import HomeSheet from 'components/Home/HomeSheet';
import {MASK} from 'components/Home/AssetRow';
import {
  readHideBalances,
  writeHideBalances,
} from 'src/hooks/protectedRoutes/wallet/home/useHome';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CloseIcon,
  EyeIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SortIcon,
} from 'components/Home/HomeIcons';

const WALLET_SORT_OPTIONS = [
  {label: 'Custom order', sub: 'Drag or use the arrows', value: 'default'},
  {
    label: 'Value: high to low',
    sub: 'Largest balance first',
    value: 'value_desc',
  },
  {
    label: 'Value: low to high',
    sub: 'Smallest balance first',
    value: 'value_asc',
  },
  {label: 'Name: A to Z', sub: 'Alphabetical', value: 'name_asc'},
  {label: 'Name: Z to A', sub: 'Reverse alphabetical', value: 'name_desc'},
];

const MoreIcon = () => (
  <svg width='18' height='18' viewBox='0 0 24 24' aria-hidden='true'>
    {[5, 12, 19].map(x => (
      <circle key={x} cx={x} cy='12' r='2' style={{fill: 'currentColor'}} />
    ))}
  </svg>
);

const GripIcon = () => (
  <svg width='14' height='18' viewBox='0 0 14 18' aria-hidden='true'>
    {[3, 9, 15].map(y =>
      [4, 10].map(x => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r='1.6'
          style={{fill: 'currentColor'}}
        />
      )),
    )}
  </svg>
);

const walletTotal = wallet =>
  (wallet?.coins || []).reduce(
    (sum, coin) =>
      coin?.isInWallet ? sum + (parseFloat(coin?.totalCourse) || 0) : sum,
    0,
  );

const formatMoney = (value, symbol) =>
  `${symbol || ''}${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Wallets = () => {
  const currentWallet = useSelector(selectCurrentWallet);
  const allWallets = useSelector(selectAllWallets);
  const visibleWallets = useMemo(
    () => allWallets.filter(wallet => !isWalletHiddenAndLocked(wallet)),
    [allWallets],
  );
  const dispatch = useDispatch();
  const router = useRouter();
  const [modalVisible, setmodalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedReveal, setMatchedReveal] = useState(null);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [hidden, setHidden] = useState(readHideBalances);
  const walletsSortOption = useSelector(getWalletsSortOption);
  const localCurrency = useSelector(getLocalCurrency);
  // Set by refreshAllWalletsCoins while it works through the wallets, so the
  // card being updated shows a spinner next to its balance (as on mobile).
  const refreshingWalletClientId = useSelector(selectRefreshingWalletClientId);

  const handleSortSelect = useCallback(
    option => {
      dispatch(setWalletsSortOption(option));
      if (option !== 'default') {
        dispatch(sortWallets({sortOption: option}));
      }
    },
    [dispatch],
  );

  // Name matches from the visible set, plus a hidden wallet appended when the
  // search text is its exact (revealed) secret code.
  const displayedWallets = useMemo(() => {
    const nameMatches = visibleWallets;
    if (!searchQuery) {
      return nameMatches;
    }
    const query = searchQuery.toLowerCase();
    const normalizedQuery = normalizeSecretCode(searchQuery);
    const filteredNameMatches = nameMatches.filter(item =>
      item?.walletName?.toLowerCase()?.includes(query),
    );
    if (matchedReveal && normalizedQuery === matchedReveal.code) {
      const matchedWallet = allWallets.find(
        item => item.walletName === matchedReveal.walletName,
      );
      // Once revealed (tapped), the wallet may already be in the name
      // matches - appending it again would duplicate the row (and its key).
      if (matchedWallet && !filteredNameMatches.includes(matchedWallet)) {
        return [...filteredNameMatches, matchedWallet];
      }
    }
    return filteredNameMatches;
  }, [searchQuery, visibleWallets, allWallets, matchedReveal]);

  const attemptRevealByCode = useMemo(
    () =>
      debounce(async code => {
        const result = await findHiddenWalletByCode(store.getState(), code);
        setMatchedReveal(
          result?.matched
            ? {code: normalizeSecretCode(code), walletName: result.walletName}
            : null,
        );
      }, 400),
    [],
  );

  const handleSearch = useCallback(
    e => {
      const text = e?.target?.value ?? '';
      setSearchQuery(text);
      const trimmed = text?.trim() || '';
      if (
        trimmed.length >= SECRET_CODE_MIN_LENGTH &&
        trimmed.length <= SECRET_CODE_MAX_LENGTH
      ) {
        attemptRevealByCode(trimmed);
      } else {
        setMatchedReveal(null);
      }
    },
    [attemptRevealByCode],
  );

  // Map a reordered VISIBLE list back onto the full wallet array (hidden wallets
  // keep their slots), recompute the active wallet's index, and persist it.
  const commitDisplayedOrder = useCallback(
    newDisplayedOrder => {
      let visibleCursor = 0;
      const newFullOrder = allWallets.map(wallet =>
        isWalletHiddenAndLocked(wallet)
          ? wallet
          : newDisplayedOrder[visibleCursor++],
      );
      dispatch(rearrangeWallet({allWallets: newFullOrder}));
      // A manual rearrange means the user is taking over the ordering; drop any
      // active sort so it isn't silently reapplied on the next visit.
      if (walletsSortOption !== 'default') {
        dispatch(setWalletsSortOption('default'));
      }
    },
    [allWallets, walletsSortOption, dispatch],
  );

  const onPressMove = useCallback(
    (visibleIndex, isMoveUp) => {
      const targetIndex = isMoveUp ? visibleIndex - 1 : visibleIndex + 1;
      if (targetIndex < 0 || targetIndex >= displayedWallets.length) {
        return;
      }
      const reordered = [...displayedWallets];
      const [moved] = reordered.splice(visibleIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      commitDisplayedOrder(reordered);
    },
    [displayedWallets, commitDisplayedOrder],
  );

  const onDragEnd = event => {
    const {active, over} = event;
    if (!over || active.id === over.id) {
      return;
    }

    const from = active?.data?.current.sortable?.index;
    const to = over?.data?.current.sortable?.index;

    const reordered = moveItem(displayedWallets, from, to);
    if (reordered) {
      commitDisplayedOrder(reordered);
    }
  };

  const walletList = displayedWallets;
  const uniqueIds = useMemo(
    () => walletList.map(item => item?.clientId),
    [walletList],
  );
  const fiatSymbol = currencySymbol[localCurrency] || '';
  const grandTotal = useMemo(
    () => visibleWallets.reduce((sum, wallet) => sum + walletTotal(wallet), 0),
    [visibleWallets],
  );
  const isCustomOrder = walletsSortOption === 'default' || !walletsSortOption;
  const canReorder = isCustomOrder && !searchQuery && walletList.length > 1;
  const sortLabel =
    WALLET_SORT_OPTIONS.find(option => option.value === walletsSortOption)
      ?.label || 'Custom order';

  // Close the ⋯ menu on any press outside it (or its own button). A backdrop
  // element can't do this here: each card sits in a SortableItem whose
  // `scale` style makes it its own stacking context, so a page-level backdrop
  // would cover the open menu and swallow clicks on its items.
  useEffect(() => {
    if (!menuId) {
      return undefined;
    }
    const onPointerDown = event => {
      if (!event.target?.closest?.('[data-wallet-menu]')) {
        setMenuId(null);
      }
    };
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        setMenuId(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuId]);

  const toggleHidden = () => {
    const next = !hidden;
    setHidden(next);
    writeHideBalances(next);
  };

  const activate = useCallback(
    item => {
      dispatch(refreshCoins());
      dispatch(resetPaymentUrl());
      if (isWalletHiddenAndLocked(item)) {
        dispatch(
          setWalletRevealed({clientId: item?.clientId, isHidden: false}),
        );
      }
      dispatch(setCurrentWalletClientId(item?.clientId));
    },
    [dispatch],
  );

  const openWallet = item => {
    activate(item);
    router.push(walletRoutes.home(item.clientId));
  };

  const editWallet = item => {
    setMenuId(null);
    router.push(
      `/wallets/create-wallet?walletName=${encodeURIComponent(
        item?.walletName,
      )}&walletClientId=${item?.clientId}`,
    );
  };

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
        <h1 className={s.title}>Wallets</h1>
        <span className={s.topActions}>
          <GeneralButton
            variant='unstyled'
            className={s.iconButton}
            aria-label='Sort wallets'
            aria-haspopup='dialog'
            onClick={() => setSortSheetOpen(true)}>
            <SortIcon size={21} />
          </GeneralButton>
          <GeneralButton
            variant='unstyled'
            className={s.iconButton}
            aria-label='Add wallet'
            aria-haspopup='dialog'
            onClick={() => setmodalVisible(true)}>
            <PlusIcon size={22} />
          </GeneralButton>
        </span>
      </div>

      <div className={s.column}>
        <div className={s.toolbar}>
          <label className={s.search}>
            <SearchIcon size={18} />
            <input
              value={searchQuery}
              onChange={handleSearch}
              placeholder='Search wallets'
              aria-label='Search wallets'
            />
            {searchQuery ? (
              <button
                type='button'
                className={s.clear}
                aria-label='Clear search'
                onClick={() => handleSearch({target: {value: ''}})}>
                <CloseIcon size={12} />
              </button>
            ) : null}
          </label>
          <RefreshWalletsButton className={s.refreshButton} />
        </div>

        <div className={s.summary}>
          <span className={s.summaryText}>
            <span className={s.summaryCount}>
              {visibleWallets.length}{' '}
              {visibleWallets.length === 1 ? 'wallet' : 'wallets'} ·
            </span>
            <span className={s.summaryTotal}>
              {hidden ? MASK : formatMoney(grandTotal, fiatSymbol)}
            </span>
            <button
              type='button'
              className={s.eye}
              aria-label={hidden ? 'Show balances' : 'Hide balances'}
              aria-pressed={hidden}
              onClick={toggleHidden}>
              <EyeIcon size={14} off={hidden} />
            </button>
          </span>
          <button
            type='button'
            className={s.sortLink}
            onClick={() => setSortSheetOpen(true)}>
            <SortIcon size={12} />
            {sortLabel}
          </button>
        </div>

        {walletList.length ? (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            modifiers={[restrictToParentElement]}>
            <SortableContext
              items={uniqueIds}
              strategy={verticalListSortingStrategy}>
              <ul className={s.list}>
                {walletList.map((item, index) => {
                  const isActive = item.clientId === currentWallet?.clientId;
                  const coins = item?.coins?.filter(c => c?.isInWallet) || [];
                  const isRefreshing =
                    item?.clientId === refreshingWalletClientId;
                  const typeLabel = item?.isImportWalletWithPrivateKey
                    ? `${item?.coins?.[0]?.chain_display_name || 'Single-coin'} wallet`
                    : 'Multi-coin wallet';
                  const menuOpen = menuId === item.clientId;
                  return (
                    <SortableItem key={item.clientId} id={item.clientId}>
                      {dragHandleProps => (
                        <div
                          className={`${s.card} ${
                            isActive ? s.cardActive : ''
                          } ${menuOpen ? s.cardRaised : ''}`}>
                          <div className={s.cardHead}>
                            {canReorder ? (
                              <span
                                className={s.grip}
                                aria-label={`Drag ${item?.walletName}`}
                                {...dragHandleProps}>
                                <GripIcon />
                              </span>
                            ) : (
                              <span className={s.avatar} aria-hidden='true'>
                                {(item?.walletName || '?')[0].toUpperCase()}
                              </span>
                            )}
                            <button
                              type='button'
                              className={s.cardMain}
                              onClick={() => openWallet(item)}>
                              <span className={s.name}>{item?.walletName}</span>
                              <span className={s.tags}>
                                {isActive ? (
                                  <span className={s.tagActive}>Active</span>
                                ) : null}
                                <span className={s.tag}>{typeLabel}</span>
                                {!item?.isBackedup &&
                                !item?.isImportWalletWithPrivateKey ? (
                                  <span className={s.tagWarn}>
                                    Not backed up
                                  </span>
                                ) : null}
                              </span>
                            </button>
                            {canReorder ? (
                              <span className={s.moves}>
                                <button
                                  type='button'
                                  className={s.move}
                                  aria-label='Move up'
                                  disabled={index === 0}
                                  onClick={() => onPressMove(index, true)}>
                                  <ChevronDownIcon size={15} className={s.up} />
                                </button>
                                <button
                                  type='button'
                                  className={s.move}
                                  aria-label='Move down'
                                  disabled={index === walletList.length - 1}
                                  onClick={() => onPressMove(index, false)}>
                                  <ChevronDownIcon size={15} />
                                </button>
                              </span>
                            ) : null}
                            <span className={s.menuWrap} data-wallet-menu>
                              <button
                                type='button'
                                className={s.more}
                                aria-label={`${item?.walletName} options`}
                                aria-haspopup='menu'
                                aria-expanded={menuOpen}
                                onClick={() =>
                                  setMenuId(menuOpen ? null : item.clientId)
                                }>
                                <MoreIcon />
                              </button>
                              {menuOpen ? (
                                <>
                                  <div className={s.menu} role='menu'>
                                    {!isActive ? (
                                      <button
                                        type='button'
                                        role='menuitem'
                                        className={s.menuItem}
                                        onClick={() => {
                                          setMenuId(null);
                                          activate(item);
                                        }}>
                                        <CheckIcon size={16} />
                                        Set as active
                                      </button>
                                    ) : null}
                                    <button
                                      type='button'
                                      role='menuitem'
                                      className={s.menuItem}
                                      onClick={() => {
                                        setMenuId(null);
                                        router.push(
                                          walletRoutes.manageCoins(
                                            item.clientId,
                                          ),
                                        );
                                      }}>
                                      <PlusIcon size={16} />
                                      Manage coins
                                    </button>
                                    <button
                                      type='button'
                                      role='menuitem'
                                      className={s.menuItem}
                                      onClick={() => editWallet(item)}>
                                      <SettingsIcon size={16} />
                                      Edit wallet
                                      <span className={s.menuHint}>
                                        Rename, back up, hide or remove
                                      </span>
                                    </button>
                                  </div>
                                </>
                              ) : null}
                            </span>
                          </div>
                          <div className={s.cardBody}>
                            <span className={s.balanceBlock}>
                              <span className={s.balanceLabel}>
                                Total balance
                              </span>
                              <span className={s.balance}>
                                {hidden
                                  ? MASK
                                  : formatMoney(walletTotal(item), fiatSymbol)}
                                {isRefreshing ? (
                                  <span
                                    className={s.spinner}
                                    aria-label='Refreshing'
                                  />
                                ) : null}
                              </span>
                            </span>
                            <span className={s.coins}>
                              <span className={s.coinStack}>
                                {coins.slice(0, 4).map((coin, i) => (
                                  <span
                                    key={coin?._id || i}
                                    className={s.coinDot}
                                    style={{zIndex: 10 - i}}>
                                    {coin.icon ? (
                                      <Image
                                        src={coin.icon}
                                        width={22}
                                        height={22}
                                        alt=''
                                      />
                                    ) : (
                                      coin.symbol?.[0]
                                    )}
                                  </span>
                                ))}
                              </span>
                              <span className={s.coinCount}>
                                {coins.length}{' '}
                                {coins.length === 1 ? 'coin' : 'coins'}
                              </span>
                            </span>
                          </div>
                        </div>
                      )}
                    </SortableItem>
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <div className={s.empty}>
            <p className={s.emptyTitle}>No wallets found</p>
            <p className={s.emptyText}>Try a different name</p>
          </div>
        )}
      </div>

      <HomeSheet
        visible={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        title='Sort wallets'
        labelId='sort-wallets-title'>
        <div className={s.sortList} role='radiogroup' aria-label='Sort'>
          {WALLET_SORT_OPTIONS.map(option => {
            const on = option.value === (walletsSortOption || 'default');
            return (
              <button
                key={option.value}
                type='button'
                role='radio'
                aria-checked={on}
                className={`${s.sortOption} ${on ? s.sortOptionOn : ''}`}
                onClick={() => {
                  handleSortSelect(option.value);
                  setSortSheetOpen(false);
                }}>
                <span className={s.sortText}>
                  <span className={s.sortTitle}>{option.label}</span>
                  <span className={s.sortSub}>{option.sub}</span>
                </span>
                {on ? <CheckIcon size={18} /> : null}
              </button>
            );
          })}
        </div>
      </HomeSheet>
      <ModalCreateWallet
        visible={modalVisible}
        hideModal={() => setmodalVisible(false)}
      />
    </main>
  );
};

export default Wallets;
