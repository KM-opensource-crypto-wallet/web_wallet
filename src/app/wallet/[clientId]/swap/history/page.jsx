'use client';
import {walletRoutes} from 'utils/routes';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useParams, useRouter} from 'next/navigation';
import InfiniteScroll from 'react-infinite-scroller';
import dayjs from 'dayjs';
import Loading from 'components/Loading';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon, SwapIcon} from 'components/Home/HomeIcons';
import {ResetIcon} from 'components/Transactions/TxIcons';
import ExchangeTransactionItem from 'components/ExchangeHistory/ExchangeTransactionItem';
import {
  fetchExchangeTransactions,
  fetchMoreExchangeTransactions,
} from 'dok-wallet-blockchain-networks/redux/exchangeHistory/exchangeHistorySlice';
import {
  selectExchangeTransactions,
  selectExchangeHistoryLoading,
  selectExchangeHistoryRefreshing,
  selectExchangeHistoryLoadingMore,
  selectExchangeHistoryError,
  selectExchangeHistoryMeta,
} from 'dok-wallet-blockchain-networks/redux/exchangeHistory/exchangeHistorySelectors';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import s from './SwapHistory.module.css';

// Swap history for the current wallet: newest first, header refresh,
// infinite scroll. The backend refreshes pending statuses on each fetch.
const dayLabel = date => {
  const day = dayjs(date);
  if (day.isSame(dayjs(), 'day')) return 'Today';
  if (day.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return day.format('D MMM YYYY');
};

const SwapHistory = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const {clientId} = useParams();

  const transactions = useSelector(selectExchangeTransactions);
  const loading = useSelector(selectExchangeHistoryLoading);
  const refreshing = useSelector(selectExchangeHistoryRefreshing);
  const loadingMore = useSelector(selectExchangeHistoryLoadingMore);
  const error = useSelector(selectExchangeHistoryError);
  const meta = useSelector(selectExchangeHistoryMeta);
  const walletClientId = useSelector(selectCurrentWalletClientId);
  const endReachedThrottleRef = useRef(0);

  useEffect(() => {
    dispatch(fetchExchangeTransactions());
  }, [dispatch, walletClientId]);

  const onRefresh = useCallback(() => {
    dispatch(fetchExchangeTransactions({refresh: true}));
  }, [dispatch]);

  const onEndReached = useCallback(() => {
    const now = Date.now();
    if (now - endReachedThrottleRef.current < 1000) {
      return;
    }
    endReachedThrottleRef.current = now;
    dispatch(fetchMoreExchangeTransactions());
  }, [dispatch]);

  const onPressItem = useCallback(
    transaction => {
      router.push(walletRoutes.swapHistoryDetails(clientId, transaction?._id));
    },
    [router, clientId],
  );

  const hasMore = (meta?.currentPage || 0) < (meta?.totalPages || 0);

  // Newest first from the API, so consecutive grouping keeps the order.
  const groups = useMemo(() => {
    const list = [];
    transactions.forEach(item => {
      const label = item?.created_at ? dayLabel(item.created_at) : 'Earlier';
      const last = list[list.length - 1];
      if (last && last.label === label) {
        last.items.push(item);
      } else {
        list.push({label, items: [item]});
      }
    });
    return list;
  }, [transactions]);

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
        <h1 className={s.title}>Swap history</h1>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Refresh'
          disabled={refreshing}
          onClick={onRefresh}>
          {refreshing ? (
            <span className={s.spinner} />
          ) : (
            <ResetIcon size={19} />
          )}
        </GeneralButton>
      </div>

      <div className={s.scrollContainer}>
        {loading && !transactions.length ? (
          <div className={s.loading}>
            <Loading />
          </div>
        ) : !transactions.length ? (
          <div className={s.empty}>
            <span className={s.emptyIcon}>
              <SwapIcon size={26} />
            </span>
            <p className={s.emptyTitle}>
              {error ? 'Could not load your swaps' : 'No swaps yet'}
            </p>
            <p className={s.emptyText}>
              {error
                ? 'Check your connection and try again.'
                : 'Your exchanges will show up here.'}
            </p>
            <button
              type='button'
              className={s.emptyAction}
              onClick={
                error
                  ? onRefresh
                  : () => router.push(walletRoutes.swap(clientId))
              }>
              {error ? 'Retry' : 'Make a swap'}
            </button>
          </div>
        ) : (
          <InfiniteScroll
            className={s.list}
            initialLoad={false}
            pageStart={1}
            loadMore={onEndReached}
            hasMore={hasMore}
            loader={
              <div className={s.footer} key={0}>
                {loadingMore ? <span className={s.spinner} /> : null}
              </div>
            }
            useWindow={false}>
            {groups.map(group => (
              <section
                key={group.label}
                className={s.group}
                aria-label={group.label}>
                <span className={s.groupLabel}>{group.label}</span>
                <div className={s.card}>
                  {group.items.map(item => (
                    <ExchangeTransactionItem
                      key={item?._id}
                      transaction={item}
                      onPress={onPressItem}
                    />
                  ))}
                </div>
              </section>
            ))}
            {!!error && (
              <p className={s.errorText} role='alert'>
                {error}
              </p>
            )}
          </InfiniteScroll>
        )}
      </div>
    </main>
  );
};

export default SwapHistory;
