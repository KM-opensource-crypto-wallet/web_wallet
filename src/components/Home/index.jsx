'use client';
import React from 'react';
import useHome from 'src/hooks/protectedRoutes/wallet/home/useHome';
import {COIN_SORT_OPTIONS} from 'src/data/lists/coinSortOptions';
import WalletConnectStatus from 'components/WalletConnectStatus';
import SortMenu from 'components/SortMenu';
import GeneralButton from 'components/Button';
import {VerifyInfoModal} from 'components/VerifyInfo';
import BatchTransactionBanner from 'components/BatchTransactionBanner';
import CoinSyncBanner from 'components/CoinSyncBanner';
import AssetRow from './AssetRow';
import WalletSwitcher from './WalletSwitcher';
import CoinPicker from './CoinPicker';
import {
  ChevronDownIcon,
  CloseIcon,
  EyeIcon,
  PlusIcon,
  SearchIcon,
  SortIcon,
} from './HomeIcons';
import s from './Home.module.css';
import PriceChange from 'components/PriceChange';

// Allocation slices: the brand accent first, then fixed hues; "Other" last.
const SLICE_COLORS = [
  'var(--background)',
  '#f79009',
  '#2e90fa',
  '#12b76a',
  'var(--hm-dot)',
];

const Notice = ({children, actionLabel, onAction, onClose}) => (
  <div className={s.notice}>
    <p className={s.noticeText}>{children}</p>
    <GeneralButton
      variant='unstyled'
      className={s.noticeAction}
      onClick={onAction}>
      {actionLabel}
    </GeneralButton>
    <GeneralButton
      variant='unstyled'
      className={s.noticeClose}
      aria-label='Dismiss'
      onClick={onClose}>
      <CloseIcon size={16} />
    </GeneralButton>
  </div>
);

const Home = () => {
  const {
    walletName,
    switcherOpen,
    openSwitcher,
    closeSwitcher,
    showNews,
    openNews,
    dismissNews,
    newCoinsMessage,
    syncNewCoins,
    dismissNewCoins,
    hidden,
    toggleHidden,
    balanceText,
    actions,
    change24h,
    allocation,
    formatFiat,
    searchQuery,
    onSearchChange,
    clearSearch,
    sortButtonRef,
    sortMenuVisible,
    toggleSortMenu,
    closeSortMenu,
    handleSortApply,
    coinsSortOption,
    coins,
    visibleCoins,
    shareById,
    localCurrency,
    openCoin,
    goToManageCoins,
    pickerMode,
    closePicker,
    onPickFromPicker,
    backupModalVisible,
    closeBackupModal,
  } = useHome();

  return (
    <>
      <main className={s.page}>
        <div className={s.glow} aria-hidden='true' />
        <div className={s.column}>
          <div className={s.topRow}>
            <GeneralButton
              variant='unstyled'
              className={s.walletPill}
              aria-haspopup='dialog'
              onClick={openSwitcher}>
              <span className={s.walletPillAvatar}>
                {walletName[0].toUpperCase()}
              </span>
              <span className={s.walletPillName}>{walletName}</span>
              <ChevronDownIcon size={16} className={s.walletPillChevron} />
            </GeneralButton>
          </div>

          <div className={s.alerts}>
            <BatchTransactionBanner />
            <CoinSyncBanner />
            {showNews ? (
              <Notice
                actionLabel='View'
                onAction={openNews}
                onClose={dismissNews}>
                Important news!
              </Notice>
            ) : null}
            {newCoinsMessage ? (
              <Notice
                actionLabel='Sync'
                onAction={syncNewCoins}
                onClose={dismissNewCoins}>
                {newCoinsMessage}
              </Notice>
            ) : null}
          </div>

          <aside className={s.side}>
            <section className={s.balanceCard} aria-label='Total balance'>
              <div className={s.balanceLabel}>
                Total balance
                <GeneralButton
                  variant='unstyled'
                  className={s.eye}
                  aria-label={hidden ? 'Show balances' : 'Hide balances'}
                  aria-pressed={hidden}
                  onClick={toggleHidden}>
                  <EyeIcon size={15} off={hidden} />
                </GeneralButton>
              </div>
              <p className={s.balanceValue}>{balanceText}</p>
              {change24h != null && !hidden ? (
                <p className={s.balanceChange}>
                  <PriceChange value={change24h} />
                  <span>past 24h</span>
                </p>
              ) : null}
              <div
                className={s.actions}
                style={{'--action-count': actions.length}}>
                {actions.map(({key, label, Icon, onClick}) => (
                  <GeneralButton
                    key={key}
                    variant='unstyled'
                    className={s.action}
                    onClick={onClick}>
                    <span className={s.actionIcon}>
                      <Icon size={20} />
                    </span>
                    <span className={s.actionLabel}>{label}</span>
                  </GeneralButton>
                ))}
              </div>
            </section>

            {allocation.length ? (
              <section className={s.allocation} aria-label='Allocation'>
                <div className={s.cardHeader}>
                  <span>Allocation</span>
                  <span>
                    {coins.length} {coins.length === 1 ? 'asset' : 'assets'}
                  </span>
                </div>
                <div className={s.allocationBar} aria-hidden='true'>
                  {allocation.map((slice, index) => (
                    <span
                      key={slice.key}
                      className={s.allocationSlice}
                      style={{
                        width: `${slice.share}%`,
                        '--slice': SLICE_COLORS[index],
                      }}
                    />
                  ))}
                </div>
                <ul className={s.allocationList}>
                  {allocation.map((slice, index) => (
                    <li key={slice.key} className={s.allocationItem}>
                      <span
                        className={s.allocationDot}
                        style={{'--slice': SLICE_COLORS[index]}}
                      />
                      <span className={s.allocationLabel}>{slice.label}</span>
                      <span className={s.allocationValue}>
                        {formatFiat(slice.value)}
                      </span>
                      <span className={s.allocationShare}>
                        {slice.share.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>

          <div className={s.main}>
            <div className={s.toolbar}>
              <label className={s.search}>
                <SearchIcon size={17} />
                <input
                  value={searchQuery}
                  onChange={onSearchChange}
                  placeholder='Search assets'
                  aria-label='Search assets'
                />
                {searchQuery ? (
                  <GeneralButton
                    variant='unstyled'
                    className={s.searchClear}
                    aria-label='Clear search'
                    onClick={clearSearch}>
                    <CloseIcon size={14} />
                  </GeneralButton>
                ) : null}
              </label>
              <GeneralButton
                ref={sortButtonRef}
                variant='unstyled'
                className={s.sortButton}
                aria-label='Sort coins'
                onClick={toggleSortMenu}>
                <SortIcon size={18} />
              </GeneralButton>
              <SortMenu
                visible={sortMenuVisible}
                onClose={closeSortMenu}
                onSelect={handleSortApply}
                currentSort={coinsSortOption}
                anchorRef={sortButtonRef}
                sortOptions={COIN_SORT_OPTIONS}
                title='Sort Coins'
              />
            </div>

            <section className={s.assets} aria-label='Assets'>
              <div className={s.assetsHeader}>
                <span>Assets</span>
                <span className={s.assetsHeaderShare}>Share</span>
                <span className={s.assetsHeaderCount}>
                  {coins.length} {coins.length === 1 ? 'asset' : 'assets'}
                </span>
              </div>
              {visibleCoins.map(item => (
                <AssetRow
                  key={item._id}
                  item={item}
                  hidden={hidden}
                  localCurrency={localCurrency}
                  share={shareById[item._id]}
                  onPick={openCoin}
                />
              ))}
              {visibleCoins.length === 0 ? (
                <p className={s.empty}>
                  {searchQuery ? 'No coins match your search' : 'No coins yet'}
                </p>
              ) : null}
            </section>

            <GeneralButton
              variant='unstyled'
              className={s.moreCoins}
              onClick={goToManageCoins}>
              <PlusIcon size={16} />
              More coins
            </GeneralButton>

            <WalletConnectStatus />
          </div>
        </div>
      </main>

      <WalletSwitcher
        visible={switcherOpen}
        onClose={closeSwitcher}
        hidden={hidden}
        localCurrency={localCurrency}
      />
      <CoinPicker
        visible={!!pickerMode}
        onClose={closePicker}
        title={pickerMode === 'receive' ? 'Receive' : 'Send'}
        coins={coins}
        hidden={hidden}
        localCurrency={localCurrency}
        onPick={onPickFromPicker}
      />
      <VerifyInfoModal
        visible={backupModalVisible}
        onClose={closeBackupModal}
      />
    </>
  );
};

export default Home;
