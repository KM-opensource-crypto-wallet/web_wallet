'use client';

import React, {useCallback, useContext, useMemo, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {
  getCurrentWalletIndex,
  selectAllWallets,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  rearrangeWallet,
  refreshCoins,
  setCurrentWalletIndex,
  setWalletPosition,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import Image from 'next/image';
import s from './Wallets.module.css';
import {useRouter} from 'next/navigation';
import ModalCreateWallet from 'components/ModalCreateWallet';
import {resetPaymentUrl} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import {getPngIcons} from 'assets/images/icons/pngIcon';
import {ThemeContext} from 'theme/ThemeContext';
import icons from 'src/assets/images/icons';
import PageTitle from 'components/PageTitle';
import {moveItem} from 'dok-wallet-blockchain-networks/helper';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import {closestCenter, DndContext} from '@dnd-kit/core';
import {restrictToParentElement} from '@dnd-kit/modifiers';
import {SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import SortableItem from 'components/Sortable/sortable';
import {getAppIcon} from 'whitelabel/whiteLabelInfo';

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

const Wallets = () => {
  const currentWalletName = useSelector(selectCurrentWallet)?.walletName;
  const allWallets = useSelector(selectAllWallets);
  const currentWalletIndex = useSelector(getCurrentWalletIndex);
  const allWalletsLength = useMemo(() => {
    return allWallets.length;
  }, [allWallets]);
  const dispatch = useDispatch();
  const router = useRouter();
  const [modalVisible, setmodalVisible] = useState(false);
  const {themeType} = useContext(ThemeContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchWallets, setSearchWallets] = useState([]);
  const PngIcons = getPngIcons(themeType);

  const handleSearch = useCallback(
    e => {
      const text = e?.target?.value;
      setSearchQuery(text);
      if (text) {
        const newList = allWallets?.filter(item => {
          return item?.walletName?.toLowerCase()?.includes(text?.toLowerCase());
        });
        setSearchWallets(newList);
      } else {
        setSearchWallets([]);
      }
    },
    [allWallets],
  );

  const onPressMove = useCallback(
    (index, isMoveUp) => {
      dispatch(setWalletPosition({index, isMoveUp}));
    },
    [dispatch],
  );

  const onDragEnd = event => {
    const {active, over} = event;
    if (!over || active.id === over.id) {
      return;
    }

    const from = active?.data?.current.sortable?.index;
    const to = over?.data?.current.sortable?.index;

    // Reorder the list
    const reorderedItems = moveItem(allWallets, from, to);

    // Storing the udated list order
    const isMoveDown = to > from;
    dispatch(
      rearrangeWallet({
        allWallets: reorderedItems,
        currentWalletIndex:
          from === currentWalletIndex
            ? to
            : isMoveDown &&
                to >= currentWalletIndex &&
                from < currentWalletIndex
              ? currentWalletIndex - 1
              : !isMoveDown &&
                  to <= currentWalletIndex &&
                  from > currentWalletIndex
                ? currentWalletIndex + 1
                : undefined,
      }),
    );
  };

  const walletList = searchQuery ? searchWallets : allWallets;
  const uniqueIds = useMemo(() => {
    return walletList.map(item => item?.id);
  }, [walletList]);
  return (
    <>
      <PageTitle
        title="Wallets"
        extraElement={
          <div className={s.extraElementContainer}>
            <button className={s.headerIconButton}>
              {icons.filter}
            </button>
            <button className={s.headerIconButton} onClick={() => setmodalVisible(true)}>
              {icons.pluscircleo}
            </button>
          </div>
        }
      />
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
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {walletList.map((item, index) => {
                const isSelectedWallet = item.walletName === currentWalletName;
                const totalBalance = item?.coins?.reduce((acc, coin) => {
                   return acc + ((parseFloat(coin?.balance) || 0) * (parseFloat(coin?.price) || 0));
                }, 0) || 0;
                
                const coinsCount = item?.coins?.length || 0;
                const displayCoins = item?.coins?.slice(0, 4) || [];

                return (
                  <SortableItem key={item.id} id={item.id}>
                    {dragHandleProps => (
                      <div className={`${s.walletCard} ${isSelectedWallet ? s.walletCardActive : ''}`}>
                         {/* Header: Name, Badge, Actions */}
                        <div className={s.cardHeader}>
                           <button 
                             className={s.leftHeader}
                             onClick={() => {
                              dispatch(refreshCoins());
                              dispatch(resetPaymentUrl());
                              if (searchQuery) {
                                const foundIndex = allWallets.findIndex(
                                  subItem => subItem.walletName === item.walletName,
                                );
                                if (foundIndex !== -1) {
                                  dispatch(setCurrentWalletIndex(foundIndex));
                                }
                              } else {
                                dispatch(setCurrentWalletIndex(index));
                              }
                              router.push('/home');
                             }}
                            >
                             <div className={s.dragHandle} {...dragHandleProps} onClick={(e) => e.stopPropagation()}>
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
                                 <span className={s.mainText}>{item?.walletName}</span>
                                 {isSelectedWallet && <span className={s.activeBadge}>Active</span>}
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
                              {!searchQuery && (
                                <>
                                  <button
                                    disabled={index === 0}
                                    className={s.actionButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPressMove(index, true);
                                    }}
                                  >
                                    <Image
                                      style={index === 0 ? disabledStyle : {}}
                                      src={PngIcons.UpArrow}
                                      alt={'Up arrow'}
                                      width={20}
                                      height={20}
                                    />
                                  </button>
                                  <button
                                    disabled={index === allWalletsLength - 1}
                                    className={s.actionButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPressMove(index, false);
                                    }}
                                  >
                                    <Image
                                      src={PngIcons.DownArrow}
                                      alt={'Down arrow'}
                                      width={20}
                                      height={20}
                                      style={
                                        index === allWalletsLength - 1
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const walletName = item?.walletName;
                                  const walletIndex = index;
                                  router.push(
                                    `/wallets/create-wallet?walletName=${walletName}&walletIndex=${walletIndex}`,
                                  );
                                }}
                              >
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
                              <span className={s.balanceLabel}>Total Balance</span>
                              <span className={s.balanceValue}>${totalBalance.toFixed(2)}</span>
                           </div>
                           
                           <div className={s.coinSummary}>
                              <div className={s.coinIcons}>
                                {displayCoins.map((coin, i) => (
                                   // Assuming coin has logo/icon. Using generic if not, or rendering image if URL.
                                   // Based on codebase, coin components usually fetch icon. 
                                   // For now, I'll try to render an Image if coin.icon exists, or a placeholder.
                                   // The current file doesn't import coin icons directly, relying on 'getAppIcon' for wallet.
                                   // I will use a simple circle div or img if I can specific coin icon.
                                   // Checking previous 'icons' imports, it seems comprehensive.
                                   // However, I don't have coin-specific URLs here easily without a helper.
                                   // I will render a small circle with the coin symbol letter as fallback or just the count.
                                   // Actually, I can use `CoinIcon` component if I import it, but I don't want to overcomplicate imports yet.
                                   // I'll use a placeholder colored circle or just the coin count text if icons are hard.
                                   // But the design shows icons.
                                   // I'll try to use `coin.icon` if it's a URL.
                                   <div key={i} className={s.miniCoinIcon} style={{overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, background: '#ddd'}}>
                                      {coin.icon ? <Image src={coin.icon} width={16} height={16} alt={coin.symbol} /> : coin.symbol?.[0]}
                                   </div>
                                ))}
                              </div>
                              <span className={s.coinCount}>{coinsCount} coins</span>
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
