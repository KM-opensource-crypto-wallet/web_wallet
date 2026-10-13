'use client';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon, SwapIcon} from 'components/Home/HomeIcons';
import {
  ArrowDownIcon,
  EmptyIcon,
  ResetIcon,
} from 'components/Transactions/TxIcons';
import Loading from 'components/Loading';
import ExchangeStatusBadge from 'components/ExchangeHistory/ExchangeStatusBadge';
import ExchangeDetailRow from 'components/ExchangeHistory/ExchangeDetailRow';
import SwapCoinIcon from 'components/ExchangeHistory/SwapCoinIcon';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';
import useSwap from 'src/hooks/protectedRoutes/wallet/swap/useSwap';
import s from './SwapDetails.module.css';

// One leg of the swap: label, coin icon, amount and chain.
const Side = ({label, icon, symbol, amount, display}) => (
  <div className={s.side}>
    <span className={s.sideLabel}>{label}</span>
    <div className={s.sideRow}>
      <SwapCoinIcon
        icon={icon}
        symbol={symbol}
        chainName={display.chainName}
        size={40}
      />
      <div className={s.sideText}>
        <span className={s.sideAmount}>
          {amount ? `${amount} ` : '— '}
          <span className={s.sideSymbol}>{symbol}</span>
        </span>
        {!!display.chainDisplayName && (
          <span className={s.sideChain}>on {display.chainDisplayName}</span>
        )}
      </div>
    </div>
  </div>
);

// Details of one swap. Polls every 30s while the status is non-terminal —
// the backend refreshes the transaction from its provider on each fetch.
const SwapDetails = () => {
  const {
    goBack,
    detailTransaction: transaction,
    detailLoading: loading,
    detailError: error,
    fromDisplay,
    toDisplay,
    swapDetails,
    hasAny,
    onRetryDetails: onRetry,
    openExplorer,
  } = useSwap('details');

  const header = (
    <div className={s.topBar}>
      <GeneralButton
        variant='unstyled'
        className={s.iconButton}
        aria-label='Back'
        onClick={goBack}>
        <ChevronLeftIcon size={24} />
      </GeneralButton>
      <h1 className={s.title}>Swap details</h1>
      {loading && transaction ? (
        <span className={s.refreshing} aria-label='Refreshing' />
      ) : (
        <span className={s.iconSpacer} aria-hidden='true' />
      )}
    </div>
  );

  if (loading && !transaction) {
    return (
      <main className={s.page}>
        <div className={s.glow} aria-hidden='true' />
        {header}
        <div className={s.loading}>
          <Loading />
        </div>
      </main>
    );
  }

  if (!transaction) {
    return (
      <main className={s.page}>
        <div className={s.glow} aria-hidden='true' />
        {header}
        <div className={s.column}>
          <div className={s.empty}>
            <span className={s.emptyIcon}>
              <EmptyIcon size={26} />
            </span>
            <p className={s.emptyTitle}>
              {error ? 'Could not load this swap' : 'Swap not found'}
            </p>
            {error ? <p className={s.emptyText}>{error}</p> : null}
            {!!error && (
              <button type='button' className={s.emptyAction} onClick={onRetry}>
                <ResetIcon size={15} />
                Retry
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const {
    metadata,
    fromChainName,
    toChainName,
    fromAmount,
    toAmount,
    fromSymbol,
    toSymbol,
    providerName,
    dateLabel,
    fromExplorerUrl,
    toExplorerUrl,
  } = swapDetails;

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      {header}
      <div className={s.column}>
        <section className={s.hero} aria-label='Swap'>
          <div className={s.heroHead}>
            <span className={s.provider}>
              <span className={s.providerLogo}>
                {metadata.providerSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={metadata.providerSrc} alt='' />
                ) : (
                  <SwapIcon size={18} />
                )}
              </span>
              <span className={s.providerText}>
                <span className={s.providerName}>{providerName}</span>
                {dateLabel ? (
                  <span className={s.providerDate}>{dateLabel}</span>
                ) : null}
              </span>
            </span>
            <ExchangeStatusBadge status={transaction.status} />
          </div>

          <Side
            label='You sent'
            icon={fromDisplay.icon}
            symbol={fromSymbol}
            amount={fromAmount}
            display={fromDisplay}
          />
          <div className={s.arrow} aria-hidden='true'>
            <span className={s.arrowLine} />
            <span className={s.arrowChip}>
              <ArrowDownIcon size={16} />
            </span>
            <span className={s.arrowLine} />
          </div>
          <Side
            label={
              transaction.status === 'completed'
                ? 'You received'
                : 'You receive'
            }
            icon={toDisplay.icon}
            symbol={toSymbol}
            amount={toAmount}
            display={toDisplay}
          />

          {transaction.status === 'pending' && (
            <p className={s.pendingHint}>
              <ResetIcon size={14} />
              Status updates automatically every 30 seconds.
            </p>
          )}
        </section>

        {hasAny(providerName, dateLabel, transaction.provider_tx_id) && (
          <section className={s.card} aria-label='Details'>
            <span className={s.cardTitle}>Details</span>
            <ExchangeDetailRow isFirst label='Provider' value={providerName} />
            <ExchangeDetailRow label='Date' value={dateLabel} />
            <ExchangeDetailRow
              label='Order ID'
              value={transaction.provider_tx_id}
              copyable
            />
          </section>
        )}

        {hasAny(
          metadata.depositAddress,
          transaction.from_memo,
          transaction.to_address,
          transaction.from_address,
        ) && (
          <section className={s.card} aria-label='Addresses'>
            <span className={s.cardTitle}>Addresses</span>
            {/* from_address is the sending wallet — the app sets the swap's
                refundAddress to it, so it doubles as the refund address. */}
            <ExchangeDetailRow
              isFirst
              label='Sender'
              value={transaction.from_address}
              copyable
            />
            <ExchangeDetailRow
              label='Deposit address'
              value={metadata.depositAddress}
              copyable
            />
            <ExchangeDetailRow
              label='Memo'
              value={transaction.from_memo}
              copyable
            />
            <ExchangeDetailRow
              label='Recipient'
              value={transaction.to_address}
              copyable
            />
          </section>
        )}

        {hasAny(transaction.from_tx_hash, transaction.to_tx_hash) && (
          <section className={s.card} aria-label='On-chain'>
            <span className={s.cardTitle}>On-chain</span>
            <ExchangeDetailRow
              isFirst
              label='Deposit tx'
              value={transaction.from_tx_hash}
              displayValue={getCustomizePublicAddress(transaction.from_tx_hash)}
              onPress={
                fromExplorerUrl
                  ? () => openExplorer(fromChainName, transaction.from_tx_hash)
                  : undefined
              }
              copyable
            />
            <ExchangeDetailRow
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
          </section>
        )}
      </div>
    </main>
  );
};

export default SwapDetails;
