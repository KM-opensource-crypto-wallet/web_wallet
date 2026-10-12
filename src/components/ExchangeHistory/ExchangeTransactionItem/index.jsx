'use client';
import React from 'react';
import dayjs from 'dayjs';
import SwapCoinIcon from 'components/ExchangeHistory/SwapCoinIcon';
import useSwapCoinDisplay from 'components/ExchangeHistory/useSwapCoinDisplay';
import {
  EXCHANGE_STATUS_CONFIG,
  truncateExchangeAmount,
} from 'components/ExchangeHistory/exchangeFormat';
import {ChevronRightIcon} from 'components/Home/HomeIcons';
import s from './ExchangeTransactionItem.module.css';

// One swap in the history list (Transaction History style): overlapping
// from / to coin icons, "BTC → ETH", provider · time, and the received /
// sent amounts. Non-completed swaps show their status instead of the sent
// amount.
const ExchangeTransactionItem = ({transaction, onPress, showDate}) => {
  const {from, to} = useSwapCoinDisplay(transaction);
  const status = transaction?.status;
  const statusConfig = EXCHANGE_STATUS_CONFIG[status];

  const providerTitle =
    transaction?.metadata?.providerTitle || transaction?.provider || '';
  const time = transaction?.created_at
    ? dayjs(transaction.created_at).format(
        showDate ? 'D MMM YYYY · HH:mm' : 'HH:mm',
      )
    : null;
  const sub = [providerTitle, time].filter(Boolean).join(' · ');
  const fromAmount = truncateExchangeAmount(transaction?.from_amount);
  const toAmount = truncateExchangeAmount(transaction?.to_amount);
  const isDone = status === 'completed';

  return (
    <button
      type='button'
      className={s.row}
      onClick={() => onPress?.(transaction)}>
      <span className={s.icons}>
        <span className={s.iconFrom}>
          <SwapCoinIcon
            icon={from.icon}
            symbol={from.symbol}
            chainName={from.chainName}
            size={30}
          />
        </span>
        <span className={s.iconTo}>
          <SwapCoinIcon
            icon={to.icon}
            symbol={to.symbol}
            chainName={to.chainName}
            size={30}
          />
        </span>
      </span>
      <span className={s.text}>
        <span className={s.title}>
          {from.symbol || '—'}
          <span className={s.arrow} aria-label='to'>
            →
          </span>
          {to.symbol || '—'}
        </span>
        {sub ? <span className={s.sub}>{sub}</span> : null}
      </span>
      <span className={s.amounts}>
        {toAmount ? (
          <span className={`${s.got} ${isDone ? s.gotDone : ''}`}>
            +{toAmount} {to.symbol || ''}
          </span>
        ) : null}
        {isDone ? (
          fromAmount ? (
            <span className={s.sent}>
              −{fromAmount} {from.symbol || ''}
            </span>
          ) : null
        ) : (
          <span
            className={s.status}
            style={{color: statusConfig?.color || undefined}}>
            <span
              className={s.statusDot}
              style={{background: statusConfig?.color || undefined}}
            />
            {statusConfig?.label || status || '—'}
          </span>
        )}
      </span>
      <ChevronRightIcon size={16} className={s.chevron} />
    </button>
  );
};

export default React.memo(ExchangeTransactionItem);
