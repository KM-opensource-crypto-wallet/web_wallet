'use client';
import Transactions, {formatSignedFiat} from 'components/Transactions';
import ModalSortTransactions from 'components/ModalSortTransactions';
import s from './Transactions.module.css';
import GeneralButton from 'components/Button';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/home/useHome';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  InfoIcon,
} from 'components/Home/HomeIcons';
import {SlidersIcon} from 'components/Transactions/TxIcons';
import useTransaction from 'src/hooks/protectedRoutes/wallet/home/send/useTransaction';
import Screen from 'components/Screen';

const TransactionsList = () => {
  const {
    walletName,
    currentCoin,
    localCurrency,
    switcherOpen,
    openSwitcher,
    closeSwitcher,
    onPressViewAll,
    summary,
    fiatSymbol,
    netCoinText,
    transactionTypes,
    selectedType,
    onPressTypeTab,
    sort,
    filter,
    hideSmallTx,
    sortLabel,
    filterLabel,
    filterCount,
    modalVisible,
    openSortModal,
    closeSortModal,
    onPressApply,
    onResetFilters,
    renderList,
    isLoading,
    isGrouped,
    isSupportUpdateTransaction,
    onPressUpdateTransaction,
    showInfo,
    toggleInfo,
  } = useTransaction('list');

  const center = (
    <GeneralButton
      variant='unstyled'
      className={s.heading}
      aria-haspopup='dialog'
      onClick={openSwitcher}>
      <h1 className={s.headingTitle}>Transactions</h1>
      <span className={s.headingSub}>
        <span className={s.walletAvatar}>{walletName[0].toUpperCase()}</span>
        <span className={s.headingSubText}>
          {currentCoin?.name ? `${currentCoin.name} · ` : ''}
          {walletName}
        </span>
        <ChevronDownIcon size={12} className={s.headingChevron} />
      </span>
    </GeneralButton>
  );

  const right = (
    <GeneralButton
      variant='unstyled'
      className={s.viewAll}
      onClick={onPressViewAll}>
      View all
      <ChevronRightIcon size={12} />
    </GeneralButton>
  );

  return (
    <Screen className={s.page} center={center} right={right}>
      <div className={s.column}>
        <section className={s.summary} aria-label='Summary'>
          <span className={s.stat}>
            <span className={s.statLabel}>Net change</span>
            <span
              className={`${s.statValue} ${
                summary.netFiat > 0 ? s.statPositive : ''
              }`}>
              {formatSignedFiat(summary.netFiat, fiatSymbol)}
            </span>
            <span className={s.statSub}>{netCoinText}</span>
          </span>
          <span className={s.statDivider} aria-hidden='true' />
          <span className={`${s.stat} ${s.statCenter}`}>
            <span className={s.statLabel}>Count</span>
            <span className={s.statValue}>{renderList.length}</span>
            <span className={s.statSub}>
              {renderList.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </span>
          <span className={s.statDivider} aria-hidden='true' />
          <span className={`${s.stat} ${s.statEnd}`}>
            <span className={s.statLabel}>Pending</span>
            <span
              className={`${s.statValue} ${
                summary.pending ? s.statWarning : ''
              }`}>
              {summary.pending}
            </span>
            <span className={s.statSub}>awaiting</span>
          </span>
        </section>

        {transactionTypes.length > 1 && (
          <div className={s.chips} role='tablist' aria-label='Type'>
            {transactionTypes.map(item => (
              <button
                key={item.value}
                type='button'
                role='tab'
                aria-selected={selectedType === item.value}
                className={`${s.chip} ${
                  selectedType === item.value ? s.chipActive : ''
                }`}
                onClick={() => onPressTypeTab(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
        )}

        <button
          type='button'
          className={s.sortBar}
          aria-haspopup='dialog'
          onClick={openSortModal}>
          <span className={s.sortText}>
            {sortLabel}
            {filterLabel ? (
              <span className={s.sortFilter}> · {filterLabel}</span>
            ) : null}
          </span>
          {filterCount ? (
            <span className={s.filterBadge}>{filterCount}</span>
          ) : null}
          <SlidersIcon size={18} />
        </button>

        <div className={s.list}>
          <Transactions
            renderList={renderList}
            currentCoin={currentCoin}
            localCurrency={localCurrency}
            isLoading={isLoading}
            grouped={isGrouped}
            hasFilters={filterCount > 0}
            onResetFilters={onResetFilters}
            onPressViewAll={onPressViewAll}
          />
        </div>

        {!isLoading ? (
          <div className={s.footer}>
            {isSupportUpdateTransaction ? (
              <button
                type='button'
                className={s.footerButton}
                onClick={onPressUpdateTransaction}>
                Update transaction
              </button>
            ) : null}
            <button
              type='button'
              className={s.footerNote}
              aria-expanded={showInfo}
              onClick={toggleInfo}>
              <InfoIcon size={13} />
              Showing your last 20 transactions
            </button>
            {showInfo && (
              <div className={s.infoCard}>
                <p className={s.infoCardTitle}>
                  Why am I missing transactions?
                </p>
                <ul className={s.infoList}>
                  <li>
                    <strong>Only the last 20</strong> transactions are fetched
                    from the network.
                  </li>
                  <li>
                    <strong>Small transactions (&lt;$1)</strong> may be hidden.
                    Toggle it in{' '}
                    <button
                      type='button'
                      className={s.infoCardLink}
                      onClick={openSortModal}>
                      Sort &amp; filter
                    </button>
                    .
                  </li>
                  <li>
                    A <strong>status filter</strong> may be active.
                  </li>
                  <li>
                    <button
                      type='button'
                      className={s.infoCardLink}
                      onClick={onPressViewAll}>
                      View all
                    </button>{' '}
                    transactions on the explorer.
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <ModalSortTransactions
        visible={modalVisible}
        hideModal={closeSortModal}
        onPressAppy={onPressApply}
        initialHideSmallTx={hideSmallTx}
        initialSort={sort}
        initialFilter={filter}
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

export default TransactionsList;
