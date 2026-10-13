'use client';
import InfiniteScroll from 'react-infinite-scroller';
import Loading from 'components/Loading';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon, SwapIcon} from 'components/Home/HomeIcons';
import {ResetIcon} from 'components/Transactions/TxIcons';
import ExchangeTransactionItem from 'components/ExchangeHistory/ExchangeTransactionItem';
import useSwap from 'src/hooks/protectedRoutes/wallet/swap/useSwap';
import s from './SwapHistory.module.css';

// Swap history for the current wallet: newest first, header refresh,
// infinite scroll. The backend refreshes pending statuses on each fetch.
const SwapHistory = () => {
  const {
    goBack,
    goToSwap,
    historyTransactions: transactions,
    historyLoading: loading,
    historyRefreshing: refreshing,
    historyLoadingMore: loadingMore,
    historyError: error,
    hasMoreHistory: hasMore,
    historyGroups: groups,
    onRefreshHistory: onRefresh,
    onHistoryEndReached: onEndReached,
    onPressHistoryItem: onPressItem,
  } = useSwap('history');

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={goBack}>
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
              onClick={error ? onRefresh : goToSwap}>
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
