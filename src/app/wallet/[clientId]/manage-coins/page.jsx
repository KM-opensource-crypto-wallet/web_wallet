'use client';
import React from 'react';
import s from './ManageCoins.module.css';
import ModalAddCoins from 'components/ModalAddCoins';
import ModalAddToken from 'components/ModalAddToken';
import DraggableCryptoList from 'components/DraggableCryptoList';
import GeneralButton from 'components/Button';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/home/useHome';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  PlusIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import useManageCoin from 'src/hooks/protectedRoutes/wallet/manageCoin/useManageCoin';
import Screen from 'components/Screen';

const MoreIcon = () => (
  <svg width='20' height='20' viewBox='0 0 24 24' aria-hidden='true'>
    <circle cx='5' cy='12' r='2' style={{fill: 'currentColor'}} />
    <circle cx='12' cy='12' r='2' style={{fill: 'currentColor'}} />
    <circle cx='19' cy='12' r='2' style={{fill: 'currentColor'}} />
  </svg>
);

const ManageCoins = () => {
  const {
    walletName,
    switcherOpen,
    openSwitcher,
    closeSwitcher,
    localCurrency,
    menuOpen,
    toggleMenu,
    closeMenu,
    hideZeroBalances,
    showAll,
    startReorder,
    sorting,
    finishReorder,
    searchQuery,
    onSearchChange,
    clearSearch,
    shownCount,
    hiddenCount,
    list,
    hasVisibleCoins,
    modalAddCoinsVisible,
    setModalAddCoinsVisible,
    openAddCoins,
    modalAddTokenVisible,
    setModalAddTokenVisible,
    openAddToken,
  } = useManageCoin();

  const center = (
    <GeneralButton
      variant='unstyled'
      className={s.heading}
      aria-haspopup='dialog'
      onClick={openSwitcher}>
      <h1 className={s.headingTitle}>Manage coins</h1>
      <span className={s.headingSub}>
        <span className={s.walletAvatar}>{walletName[0].toUpperCase()}</span>
        <span className={s.headingSubText}>{walletName}</span>
        <ChevronDownIcon size={12} className={s.headingChevron} />
      </span>
    </GeneralButton>
  );

  const right = (
    <div className={s.menuWrap}>
      <GeneralButton
        variant='unstyled'
        className={s.iconButton}
        aria-label='More'
        aria-haspopup='menu'
        aria-expanded={menuOpen}
        onClick={toggleMenu}>
        <MoreIcon />
      </GeneralButton>
      {menuOpen ? (
        <>
          <button
            type='button'
            className={s.menuBackdrop}
            aria-label='Close menu'
            onClick={closeMenu}
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
              onClick={startReorder}>
              Reorder coins
            </button>
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <Screen className={s.page} center={center} right={right}>
      <div className={s.column}>
        {sorting ? (
          <div className={s.sortBanner}>
            <span>Drag a coin, or use the arrows, to change its place.</span>
            <button
              type='button'
              className={s.sortDone}
              onClick={finishReorder}>
              Done
            </button>
          </div>
        ) : (
          <>
            <label className={s.search}>
              <SearchIcon size={18} />
              <input
                value={searchQuery}
                onChange={onSearchChange}
                placeholder='Search coins in this wallet'
                aria-label='Search coins'
              />
              {searchQuery ? (
                <button
                  type='button'
                  className={s.clear}
                  aria-label='Clear search'
                  onClick={clearSearch}>
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
          {hasVisibleCoins ? (
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
              <button type='button' className={s.addRow} onClick={openAddCoins}>
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
              <button type='button' className={s.addRow} onClick={openAddToken}>
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
        onClose={closeSwitcher}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
    </Screen>
  );
};

export default ManageCoins;
