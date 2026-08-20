'use client';
import {useCallback, useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useRouter} from 'next/navigation';
import InfiniteScroll from 'react-infinite-scroller';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageTitle from 'components/PageTitle';
import Loading from 'components/Loading';
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
const SwapHistory = () => {
  const dispatch = useDispatch();
  const router = useRouter();

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
      router.push(`/swap/history/${transaction?._id}`);
    },
    [router],
  );

  const hasMore = (meta?.currentPage || 0) < (meta?.totalPages || 0);

  const refreshButton = (
    <div className={s.headerAction}>
      <button
        className={s.refreshButton}
        onClick={onRefresh}
        disabled={refreshing}
        aria-label='Refresh'>
        {refreshing ? (
          <CircularProgress size={20} sx={{color: 'var(--background)'}} />
        ) : (
          <RefreshIcon />
        )}
      </button>
    </div>
  );

  return (
    <div className={s.page}>
      <PageTitle title='Swap History' extraElement={refreshButton} />
      {loading && !transactions.length ? (
        <Loading />
      ) : (
        <div className={s.scrollContainer}>
          {!transactions.length ? (
            <div className={s.emptyContainer}>
              <p className={s.emptyText}>
                {error
                  ? 'Could not load your swap history.'
                  : 'No swaps yet. Your exchange transactions will appear here.'}
              </p>
              <button
                className={s.emptyButton}
                onClick={error ? onRefresh : () => router.push('/swap')}>
                {error ? 'Retry' : 'Make a swap'}
              </button>
            </div>
          ) : (
            <>
              <InfiniteScroll
                className={s.list}
                initialLoad={false}
                pageStart={1}
                loadMore={onEndReached}
                hasMore={hasMore}
                loader={
                  <div className={s.footer} key={0}>
                    {loadingMore ? (
                      <CircularProgress
                        size={24}
                        sx={{color: 'var(--background)'}}
                      />
                    ) : null}
                  </div>
                }
                useWindow={false}>
                {transactions.map(item => (
                  <ExchangeTransactionItem
                    key={item?._id}
                    transaction={item}
                    onPress={onPressItem}
                  />
                ))}
              </InfiniteScroll>
              {!!error && <p className={s.errorText}>{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SwapHistory;
