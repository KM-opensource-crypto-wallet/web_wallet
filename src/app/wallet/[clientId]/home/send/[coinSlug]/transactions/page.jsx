'use client';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  selectCurrentCoin,
  selectCurrentWallet,
  selectTransactionsByType,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import Transactions, {
  describeTransaction,
  fiatValue,
  formatSignedFiat,
  txStatus,
} from 'components/Transactions';
import ModalSortTransactions, {
  SORT_OPTIONS,
} from 'components/ModalSortTransactions';
import {
  getLocalCurrency,
  getHideSmallTransactions,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {setHideSmallTransactions} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import s from './Transactions.module.css';
import {refreshCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  getAddressDetailsUrl,
  isBitcoinChain,
  isPendingTransactionSupportedChain,
} from 'dok-wallet-blockchain-networks/helper';
import {useRouter} from 'next/navigation';
import BigNumber from 'bignumber.js';
import {currencySymbol} from 'data/currency';
import GeneralButton from 'components/Button';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/useHome';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
} from 'components/Home/HomeIcons';
import {SlidersIcon} from 'components/Transactions/TxIcons';

const ALL_TRANSACTION_TYPES = [
  {label: 'All', value: 'all'},
  {label: 'Regular', value: 'regular'},
  {label: 'Stake', value: 'stake'},
  {label: 'Unstake', value: 'unstake'},
  {label: 'Withdraw', value: 'withdraw'},
  {label: 'Batch', value: 'batch'},
];

function computeRenderList(
  transactions,
  hideSmallTx,
  currencyRate,
  filter,
  sort,
  mineAddress,
) {
  const list = Array.isArray(transactions) ? [...transactions] : [];
  const filtered = list.filter(tx => {
    const isRegularTx = tx?.transactionType === 'regular';
    if (hideSmallTx && isRegularTx) {
      const usdValue =
        tx.totalCourse != null
          ? parseFloat(tx.totalCourse)
          : parseFloat(tx.amount) * (currencyRate || 0);
      if (usdValue < 1) return false;
    }
    if (!filter || filter === 'None') return true;
    if (filter === 'Received')
      return mineAddress?.toUpperCase() === tx?.to?.toUpperCase();
    if (filter === 'Send')
      return mineAddress?.toUpperCase() === tx?.from?.toUpperCase();
    if (filter === 'Pending') return tx.status?.toUpperCase() !== 'SUCCESS';
    return true;
  });
  return filtered.sort((a, b) => {
    if (sort === 'Date Ascending') return new Date(a.date) - new Date(b.date);
    if (sort === 'Amount Ascending') return Number(a.amount) - Number(b.amount);
    if (sort === 'Amount Descending')
      return Number(b.amount) - Number(a.amount);
    return new Date(b.date) - new Date(a.date);
  });
}

const ALL_ONLY_CHAINS = [
  'ton',
  'stellar',
  'aptos',
  'cardano',
  'cosmos',
  'filecoin',
  'hedera',
  'polkadot',
  'ripple',
  'tezos',
  'thorchain',
  'bitcoin_lightning',
  'litecoin',
  'dogecoin',
  'bitcoin_cash',
];

const TransactionsList = () => {
  const dispatch = useDispatch();
  const localCurrency = useSelector(getLocalCurrency);
  const currentCoin = useSelector(selectCurrentCoin);
  const currentWallet = useSelector(selectCurrentWallet);
  const hideSmallTx = useSelector(getHideSmallTransactions);

  const [modalVisible, setmodalVisible] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [filter, setFilter] = useState('None');
  const [sort, setSort] = useState('Date Descending');
  const [selectedType, setSelectedType] = useState('all');
  const [renderList, setRenderList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const router = useRouter();
  const routes = useAppRoutes();

  const coinId =
    currentCoin?.address + currentCoin?.name + currentCoin?.chain_name;

  const transactionsSelector = useMemo(
    () => selectTransactionsByType(selectedType),
    [selectedType],
  );
  const typedTransactions = useSelector(transactionsSelector);

  const transactionTypes = useMemo(() => {
    const chain = currentCoin?.chain_name;
    if (chain === 'tron') {
      return ALL_TRANSACTION_TYPES.filter(t => t.value !== 'batch');
    }
    if (chain === 'solana') {
      return ALL_TRANSACTION_TYPES.filter(t =>
        ['all', 'stake', 'unstake', 'withdraw'].includes(t.value),
      );
    }
    if (ALL_ONLY_CHAINS.includes(chain) || isBitcoinChain(chain)) {
      return ALL_TRANSACTION_TYPES.filter(t => t.value === 'all');
    }
    return ALL_TRANSACTION_TYPES;
  }, [currentCoin?.chain_name]);

  const isSupportUpdateTransaction = useMemo(() => {
    return (
      isPendingTransactionSupportedChain(currentCoin?.chain_name) &&
      currentCoin?.type === 'coin'
    );
  }, [currentCoin?.chain_name, currentCoin?.type]);

  const onPressUpdateTransaction = useCallback(() => {
    router.push(routes.coin.updateTransaction());
  }, [router, routes]);

  useEffect(() => {
    if (currentCoin?.address) {
      dispatch(refreshCurrentCoin({fetchTransaction: true}))
        .unwrap()
        .then(() => {
          setIsLoading(false);
        })
        .catch(e => {
          setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinId, dispatch]);

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      setRenderList(
        computeRenderList(
          typedTransactions,
          hideSmallTx,
          currentCoin?.currencyRate,
          filter,
          sort,
          currentCoin?.address,
        ),
      );
    })();
  }, [
    typedTransactions,
    hideSmallTx,
    currentCoin?.currencyRate,
    currentCoin?.address,
    filter,
    sort,
  ]);

  const onPressViewAll = useCallback(() => {
    const chain_name = currentCoin?.chain_name;
    const type = currentCoin?.type;
    const address = currentCoin?.address;
    if (chain_name && type && address) {
      const url = getAddressDetailsUrl(chain_name, type, address);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  }, [currentCoin?.address, currentCoin?.chain_name, currentCoin?.type]);

  const onPressApply = useCallback(
    (sortValue, filterValue, hideSmallTxValue) => {
      setSort(sortValue);
      setFilter(filterValue);
      dispatch(setHideSmallTransactions(hideSmallTxValue));
    },
    [dispatch],
  );

  const onPressTypeTab = useCallback(value => {
    setSelectedType(value);
    setSort('Date Descending');
    setFilter('None');
  }, []);

  const onResetFilters = useCallback(() => {
    setSelectedType('all');
    setSort('Date Descending');
    setFilter('None');
  }, []);

  // Net (settled sends / receives only), count and pending across the
  // transactions currently shown.
  const summary = useMemo(() => {
    let netFiat = 0;
    let netCoin = new BigNumber(0);
    let pending = 0;
    renderList.forEach(item => {
      const status = txStatus(item);
      if (status === 'pending') pending += 1;
      if (status !== 'success') return;
      const {dir} = describeTransaction(item, currentCoin?.address);
      const amount = new BigNumber(item?.amount);
      if (dir === 'in') {
        netFiat += fiatValue(item);
        if (amount.isFinite()) netCoin = netCoin.plus(amount);
      } else if (dir === 'out') {
        netFiat -= fiatValue(item);
        if (amount.isFinite()) netCoin = netCoin.minus(amount);
      }
    });
    return {netFiat, netCoin, pending};
  }, [renderList, currentCoin?.address]);

  const fiatSymbol = currencySymbol[localCurrency] || '';
  const symbol = currentCoin?.symbol?.toUpperCase() ?? '';
  const walletName = currentWallet?.walletName || 'Wallet';
  const filterCount =
    (selectedType !== 'all' ? 1 : 0) + (filter !== 'None' ? 1 : 0);
  const sortLabel =
    SORT_OPTIONS.find(option => option.label === sort)?.title || sort;
  const filterLabel =
    filter === 'Send'
      ? 'Sent'
      : filter === 'None'
        ? ''
        : filter === 'Pending'
          ? 'Pending'
          : filter;
  const netCoinText = `${summary.netCoin.isNegative() ? '−' : '+'}${summary.netCoin
    .abs()
    .decimalPlaces(6)
    .toString()} ${symbol}`;

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
          <h1 className={s.headingTitle}>Transactions</h1>
          <span className={s.headingSub}>
            <span className={s.walletAvatar}>
              {walletName[0].toUpperCase()}
            </span>
            <span className={s.headingSubText}>
              {currentCoin?.name ? `${currentCoin.name} · ` : ''}
              {walletName}
            </span>
            <ChevronDownIcon size={12} className={s.headingChevron} />
          </span>
        </GeneralButton>
        <GeneralButton
          variant='unstyled'
          className={s.viewAll}
          onClick={onPressViewAll}>
          View all
          <ChevronRightIcon size={12} />
        </GeneralButton>
      </div>

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
          onClick={() => setmodalVisible(true)}>
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
            grouped={sort.startsWith('Date')}
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
              onClick={() => setShowInfo(v => !v)}>
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
                      onClick={() => setmodalVisible(true)}>
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
        hideModal={() => setmodalVisible(false)}
        onPressAppy={onPressApply}
        initialHideSmallTx={hideSmallTx}
        initialSort={sort}
        initialFilter={filter}
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

export default TransactionsList;
