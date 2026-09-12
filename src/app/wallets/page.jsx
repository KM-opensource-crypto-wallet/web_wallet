'use client';

import React, {useCallback, useContext, useMemo, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  isWalletHiddenAndLocked,
  selectAllWallets,
  selectCurrentWallet,
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
import SortMenu from 'components/SortMenu';
import Image from 'next/image';
import s from './Wallets.module.css';
import {useRouter} from 'next/navigation';
import ModalCreateWallet from 'components/ModalCreateWallet';
import {getPngIcons} from 'assets/images/icons/pngIcon';
import {ThemeContext} from 'theme/ThemeContext';
import icons from 'src/assets/images/icons';
import PageTitle from 'components/PageTitle';
import {debounce, moveItem} from 'dok-wallet-blockchain-networks/helper';
import {
  normalizeSecretCode,
  SECRET_CODE_MAX_LENGTH,
  SECRET_CODE_MIN_LENGTH,
} from 'utils/hideWallet';
import {store} from 'redux/store';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import {closestCenter, DndContext} from '@dnd-kit/core';
import {restrictToParentElement} from '@dnd-kit/modifiers';
import {SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import SortableItem from 'components/Sortable/sortable';
import {getAppIcon} from 'whitelabel/whiteLabelInfo';
import {currencySymbol} from 'data/currency';

function getStyle(style) {
  if (style.transform) {
    const axisLockY =
      'translate(0px' +
      style.transform.slice(
        style.transform.indexOf(','),
        style.transform.length,
      );
    return {
      ...style,
      transform: axisLockY,
    };
  }
  return style;
}

const disabledStyle = {
  filter: 'opacity(0.5) drop-shadow(0 0 0 gray)',
  cursor: 'not-allowed',
};

const WALLET_SORT_OPTIONS = [
  {label: 'Default Order', value: 'default', showDivider: true},
  {label: 'Value: High to Low', value: 'value_desc'},
  {label: 'Value: Low to High', value: 'value_asc', showDivider: true},
  {label: 'Name: A to Z', value: 'name_asc'},
  {label: 'Name: Z to A', value: 'name_desc'},
];

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
  const {themeType} = useContext(ThemeContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedReveal, setMatchedReveal] = useState(null);
  const PngIcons = getPngIcons(themeType);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const filterButtonRef = useRef(null);
  const walletsSortOption = useSelector(getWalletsSortOption);
  const localCurrency = useSelector(getLocalCurrency);

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
  const uniqueIds = useMemo(() => {
    return walletList.map(item => item?.clientId);
  }, [walletList]);
  return (
    <>
      <PageTitle
        title='Wallets'
        extraElement={
          <div className={s.extraElementContainer}>
            <button
              ref={filterButtonRef}
              className={s.headerIconButton}
              onClick={() => setSortMenuVisible(prev => !prev)}>
              {icons.filter}
            </button>
            <button
              className={s.headerIconButton}
              onClick={() => setmodalVisible(true)}>
              {icons.pluscircleo}
            </button>
          </div>
        }
      />
      <div className={s.sortMenuWrapper}>
        <SortMenu
          visible={sortMenuVisible}
          onClose={() => setSortMenuVisible(false)}
          onSelect={handleSortSelect}
          currentSort={walletsSortOption}
          anchorRef={filterButtonRef}
          sortOptions={WALLET_SORT_OPTIONS}
          title='Sort Wallets'
        />
      </div>
      <div className={s.container}>
        <TextField
          placeholder='Search'
          variant='outlined'
          id='search-bar'
          fullWidth
          value={searchQuery}
          onChange={handleSearch}
          sx={{
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
              {
                borderColor: 'var(--gray)',
              },
            '& .MuiOutlinedInput-root': {
              border: '1px solid var(--gray)',
              borderRadius: '10px',
              marginBottom: '10px',
              fontSize: '18px',
              marginTop: '20px',
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <IconButton type='submit' aria-label='search'>
                  <SearchIcon
                    sx={{
                      color: 'gray',
                      marginRight: '10px',
                    }}
                  />
                </IconButton>
              ),
              endAdornment: searchQuery && (
                <IconButton
                  onClick={() => handleSearch({target: {value: ''}})}
                  size='small'
                  sx={{
                    color: 'gray',
                  }}>
                  <ClearIcon />
                </IconButton>
              ),
            },
          }}
        />
        <div className={s.walletSection}>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            modifiers={[restrictToParentElement]}>
            <SortableContext
              items={uniqueIds}
              strategy={verticalListSortingStrategy}>
              <ul style={{listStyle: 'none', padding: 0}}>
                {walletList.map((item, index) => {
                  const isSelectedWallet =
                    item.clientId === currentWallet?.clientId;
                  const visibleIndex = index;
                  const showMoveButtons =
                    displayedWallets.length > 1 && !searchQuery;
                  const totalBalance =
                    item?.coins?.reduce((acc, coin) => {
                      if (!coin?.isInWallet) return acc;
                      return acc + (parseFloat(coin?.totalCourse) || 0);
                    }, 0) || 0;

                  const walletCoins =
                    item?.coins?.filter(c => c?.isInWallet) || [];
                  const coinsCount = walletCoins.length;
                  const displayCoins = walletCoins.slice(0, 4);

                  return (
                    <SortableItem key={item.clientId} id={item.clientId}>
                      {dragHandleProps => (
                        <div
                          className={`${s.walletCard} ${isSelectedWallet ? s.walletCardActive : ''}`}>
                          {/* Header: Name, Badge, Actions */}
                          <div className={s.cardHeader}>
                            <button
                              className={s.leftHeader}
                              onClick={() => {
                                dispatch(refreshCoins());
                                dispatch(resetPaymentUrl());
                                if (isWalletHiddenAndLocked(item)) {
                                  dispatch(
                                    setWalletRevealed({
                                      clientId: item?.clientId,
                                      isHidden: false,
                                    }),
                                  );
                                }
                                dispatch(
                                  setCurrentWalletClientId(item?.clientId),
                                );
                                router.push(`/wallet/${item.clientId}/home`);
                              }}>
                              <div
                                className={s.dragHandle}
                                {...dragHandleProps}
                                onClick={e => e.stopPropagation()}>
                                {icons.dragVertical}
                              </div>

                              <div className={s.avatarWrapper}>
                                <Image
                                  className={s.avatarAvatar}
                                  alt='avatar'
                                  width={40}
                                  height={40}
                                  src={getAppIcon()}
                                />
                              </div>

                              <div className={s.walletTitleGroup}>
                                <div className={s.walletNameRow}>
                                  <span className={s.mainText}>
                                    {item?.walletName}
                                  </span>
                                  {isSelectedWallet && (
                                    <span className={s.activeBadge}>
                                      Active
                                    </span>
                                  )}
                                </div>
                                <span className={s.secondaryText}>
                                  {item?.isImportWalletWithPrivateKey
                                    ? `${item?.coins?.[0]?.chain_display_name || ''} Wallet`
                                    : 'Multi-Coin Wallet'}
                                </span>
                              </div>
                            </button>

                            <div className={s.cardActions}>
                              {/* Move Up/Down Arrows (Preserved) */}
                              {showMoveButtons && (
                                <>
                                  <button
                                    disabled={visibleIndex === 0}
                                    className={s.actionButton}
                                    onClick={e => {
                                      e.stopPropagation();
                                      onPressMove(visibleIndex, true);
                                    }}>
                                    <Image
                                      style={
                                        visibleIndex === 0 ? disabledStyle : {}
                                      }
                                      src={PngIcons.UpArrow}
                                      alt={'Up arrow'}
                                      width={20}
                                      height={20}
                                    />
                                  </button>
                                  <button
                                    disabled={
                                      visibleIndex ===
                                      displayedWallets.length - 1
                                    }
                                    className={s.actionButton}
                                    onClick={e => {
                                      e.stopPropagation();
                                      onPressMove(visibleIndex, false);
                                    }}>
                                    <Image
                                      src={PngIcons.DownArrow}
                                      alt={'Down arrow'}
                                      width={20}
                                      height={20}
                                      style={
                                        visibleIndex ===
                                        displayedWallets.length - 1
                                          ? disabledStyle
                                          : {}
                                      }
                                    />
                                  </button>
                                </>
                              )}

                              {/* Menu Button */}
                              <button
                                className={s.actionButton}
                                onClick={e => {
                                  e.stopPropagation();
                                  const walletName = item?.walletName;
                                  router.push(
                                    `/wallets/create-wallet?walletName=${encodeURIComponent(walletName)}&walletClientId=${item?.clientId}`,
                                  );
                                }}>
                                <Image
                                  src={PngIcons.MenuVertical}
                                  alt={'Menu vertical'}
                                  width={20}
                                  height={20}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Body: Balance, Coins */}
                          <div className={s.cardBody}>
                            <div className={s.balanceSection}>
                              <span className={s.balanceLabel}>
                                Total Balance
                              </span>
                              <span className={s.balanceValue}>
                                {currencySymbol[localCurrency]}
                                {totalBalance.toFixed(2)}
                              </span>
                            </div>

                            <div className={s.coinSummary}>
                              <div className={s.coinIcons}>
                                {displayCoins.map((coin, i) => (
                                  <div
                                    key={i}
                                    className={s.miniCoinIcon}
                                    style={{
                                      overflow: 'hidden',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 8,
                                      background: '#ddd',
                                    }}>
                                    {coin.icon ? (
                                      <Image
                                        src={coin.icon}
                                        width={16}
                                        height={16}
                                        alt={coin.symbol}
                                      />
                                    ) : (
                                      coin.symbol?.[0]
                                    )}
                                  </div>
                                ))}
                              </div>
                              <span className={s.coinCount}>
                                {coinsCount} coins
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </SortableItem>
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
        <ModalCreateWallet
          visible={modalVisible}
          hideModal={() => setmodalVisible(false)}
        />
      </div>
    </>
  );
};

export default Wallets;
