'use client';
import {useCallback, useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useParams} from 'next/navigation';
import dayjs from 'dayjs';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SyncIcon from '@mui/icons-material/Sync';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SendIcon from '@mui/icons-material/Send';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ArrowCircleUpOutlinedIcon from '@mui/icons-material/ArrowCircleUpOutlined';
import ArrowCircleDownOutlinedIcon from '@mui/icons-material/ArrowCircleDownOutlined';
import PageTitle from 'components/PageTitle';
import Loading from 'components/Loading';
import ExchangeStatusBadge from 'components/ExchangeHistory/ExchangeStatusBadge';
import ExchangeDetailRow from 'components/ExchangeHistory/ExchangeDetailRow';
import SwapCoinIcon from 'components/ExchangeHistory/SwapCoinIcon';
import useSwapCoinDisplay from 'components/ExchangeHistory/useSwapCoinDisplay';
import {
  truncateExchangeAmount,
  getExchangeChainNames,
  TERMINAL_EXCHANGE_STATUSES,
} from 'components/ExchangeHistory/exchangeFormat';
import {
  fetchExchangeTransactionDetails,
  clearCurrentExchangeTransaction,
} from 'dok-wallet-blockchain-networks/redux/exchangeHistory/exchangeHistorySlice';
import {
  selectCurrentExchangeTransaction,
  selectExchangeDetailLoading,
  selectExchangeDetailError,
} from 'dok-wallet-blockchain-networks/redux/exchangeHistory/exchangeHistorySelectors';
import {
  getCustomizePublicAddress,
  getExplorerTxUrl,
} from 'dok-wallet-blockchain-networks/helper';
import s from './SwapDetails.module.css';

const POLL_INTERVAL_MS = 30_000;

// Details of one swap. Polls every 30s while the status is non-terminal —
// the backend refreshes the transaction from its provider on each fetch.
const SwapDetails = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const transactionId = params?.transactionId
    ? decodeURIComponent(params.transactionId)
    : undefined;

  const transaction = useSelector(selectCurrentExchangeTransaction);
  const loading = useSelector(selectExchangeDetailLoading);
  const error = useSelector(selectExchangeDetailError);

  const isTerminal = TERMINAL_EXCHANGE_STATUSES.includes(transaction?.status);
  const {from: fromDisplay, to: toDisplay} = useSwapCoinDisplay(transaction);

  useEffect(() => {
    if (transactionId) {
      dispatch(fetchExchangeTransactionDetails({id: transactionId}));
    }
    return () => {
      dispatch(clearCurrentExchangeTransaction());
    };
  }, [dispatch, transactionId]);

  useEffect(() => {
    if (!transactionId || isTerminal) {
      return;
    }
    const interval = setInterval(() => {
      dispatch(fetchExchangeTransactionDetails({id: transactionId}));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [dispatch, transactionId, isTerminal]);

  const onRetry = useCallback(() => {
    if (transactionId) {
      dispatch(
        fetchExchangeTransactionDetails({id: transactionId, refresh: true}),
      );
    }
  }, [dispatch, transactionId]);

  const openExplorer = useCallback((chainName, hash) => {
    const url = getExplorerTxUrl(chainName, hash);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  if (loading && !transaction) {
    return (
      <>
        <PageTitle title='Swap Details' />
        <Loading />
      </>
    );
  }

  if (!transaction) {
    return (
      <>
        <PageTitle title='Swap Details' />
        <div className={s.emptyContainer}>
          <p className={s.emptyText}>
            {error || 'Exchange transaction not found.'}
          </p>
          {!!error && (
            <button className={s.emptyButton} onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      </>
    );
  }

  const metadata = transaction.metadata || {};
  const {fromChainName, toChainName} = getExchangeChainNames(transaction);
  const fromAmount = truncateExchangeAmount(transaction.from_amount);
  const toAmount = truncateExchangeAmount(transaction.to_amount);
  const fromSymbol = transaction.from_currency?.toUpperCase() || '';
  const toSymbol = transaction.to_currency?.toUpperCase() || '';
  const providerName = metadata.providerTitle || transaction.provider;
  const dateLabel = transaction.created_at
    ? dayjs(transaction.created_at).format('DD MMM YYYY, hh:mm A')
    : null;
  const fromExplorerUrl =
    fromChainName && transaction.from_tx_hash
      ? getExplorerTxUrl(fromChainName, transaction.from_tx_hash)
      : null;
  const toExplorerUrl =
    toChainName && transaction.to_tx_hash
      ? getExplorerTxUrl(toChainName, transaction.to_tx_hash)
      : null;
  const hasAny = (...values) =>
    values.some(value => value !== null && value !== undefined && value !== '');

  return (
    <>
      <PageTitle title='Swap Details' />
      <div className={s.container}>
        <div className={s.swapCard}>
          <div className={s.swapCardHeader}>
            <div className={s.logoCircle}>
              {metadata.providerSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={metadata.providerSrc} alt='' className={s.logo} />
              ) : (
                <SwapHorizIcon className={s.logoFallbackIcon} />
              )}
            </div>
            <ExchangeStatusBadge status={transaction.status} />
          </div>

          <div className={s.amountBlock}>
            <p className={s.amountLabel}>You sent</p>
            <div className={s.amountRow}>
              <SwapCoinIcon
                icon={fromDisplay.icon}
                symbol={fromSymbol}
                chainName={fromDisplay.chainName}
                size={38}
              />
              <div className={s.amountTextBox}>
                <span className={s.amountValue}>
                  {fromAmount
                    ? `${fromAmount} ${fromSymbol}`
                    : `— ${fromSymbol}`}
                </span>
                {!!fromDisplay.chainDisplayName && (
                  <span className={s.chainNameText}>
                    {`on ${fromDisplay.chainDisplayName}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={s.arrowDivider}>
            <div className={s.dividerLine} />
            <div className={s.arrowChip}>
              <ArrowDownwardIcon className={s.arrowChipIcon} />
            </div>
            <div className={s.dividerLine} />
          </div>

          <div className={s.amountBlock}>
            <p className={s.amountLabel}>
              {transaction.status === 'completed'
                ? 'You received'
                : 'You receive'}
            </p>
            <div className={s.amountRow}>
              <SwapCoinIcon
                icon={toDisplay.icon}
                symbol={toSymbol}
                chainName={toDisplay.chainName}
                size={38}
              />
              <div className={s.amountTextBox}>
                <span className={s.amountValue}>
                  {toAmount ? `${toAmount} ${toSymbol}` : `— ${toSymbol}`}
                </span>
                {!!toDisplay.chainDisplayName && (
                  <span className={s.chainNameText}>
                    {`on ${toDisplay.chainDisplayName}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className={s.metaFooter}>
            {`via ${providerName}${dateLabel ? ` · ${dateLabel}` : ''}`}
          </p>
          {transaction.status === 'pending' && (
            <div className={s.pendingHintRow}>
              <SyncIcon className={s.pendingHintIcon} />
              <span className={s.pendingHint}>
                Status updates automatically every 30 seconds.
              </span>
            </div>
          )}
        </div>

        {hasAny(providerName, dateLabel, transaction.provider_tx_id) && (
          <>
            <p className={s.sectionTitle}>Details</p>
            <div className={s.sectionCard}>
              <ExchangeDetailRow
                isFirst
                icon={<SwapHorizIcon />}
                label='Provider'
                value={providerName}
              />
              <ExchangeDetailRow
                icon={<CalendarTodayIcon />}
                label='Date'
                value={dateLabel}
              />
              <ExchangeDetailRow
                icon={<ReceiptLongIcon />}
                label='Order id'
                value={transaction.provider_tx_id}
                copyable
              />
            </div>
          </>
        )}

        {hasAny(
          metadata.depositAddress,
          transaction.from_memo,
          transaction.to_address,
          transaction.from_address,
        ) && (
          <>
            <p className={s.sectionTitle}>Addresses</p>
            <div className={s.sectionCard}>
              {/* from_address is the sending wallet — the app sets the swap's
                  refundAddress to it, so it doubles as the refund address. */}
              <ExchangeDetailRow
                isFirst
                icon={<SendIcon />}
                label='Sender address'
                value={transaction.from_address}
                copyable
              />
              <ExchangeDetailRow
                icon={<AccountBalanceWalletOutlinedIcon />}
                label='Deposit address'
                value={metadata.depositAddress}
                copyable
              />
              <ExchangeDetailRow
                icon={<DescriptionOutlinedIcon />}
                label='Memo'
                value={transaction.from_memo}
                copyable
              />
              <ExchangeDetailRow
                icon={<PersonOutlineIcon />}
                label='Recipient'
                value={transaction.to_address}
                copyable
              />
            </div>
          </>
        )}

        {hasAny(transaction.from_tx_hash, transaction.to_tx_hash) && (
          <>
            <p className={s.sectionTitle}>On-chain</p>
            <div className={s.sectionCard}>
              <ExchangeDetailRow
                isFirst
                icon={<ArrowCircleUpOutlinedIcon />}
                label='Deposit tx'
                value={transaction.from_tx_hash}
                displayValue={getCustomizePublicAddress(
                  transaction.from_tx_hash,
                )}
                onPress={
                  fromExplorerUrl
                    ? () =>
                        openExplorer(fromChainName, transaction.from_tx_hash)
                    : undefined
                }
                copyable
              />
              <ExchangeDetailRow
                icon={<ArrowCircleDownOutlinedIcon />}
                label='Receive tx'
                value={transaction.to_tx_hash}
                displayValue={getCustomizePublicAddress(transaction.to_tx_hash)}
                onPress={
                  toExplorerUrl
                    ? () => openExplorer(toChainName, transaction.to_tx_hash)
                    : undefined
                }
                copyable
              />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default SwapDetails;
