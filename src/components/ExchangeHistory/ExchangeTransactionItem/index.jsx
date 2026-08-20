'use client';
import React from 'react';
import dayjs from 'dayjs';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ExchangeStatusBadge from 'components/ExchangeHistory/ExchangeStatusBadge';
import SwapCoinIcon from 'components/ExchangeHistory/SwapCoinIcon';
import useSwapCoinDisplay from 'components/ExchangeHistory/useSwapCoinDisplay';
import {truncateExchangeAmount} from 'components/ExchangeHistory/exchangeFormat';
import s from './ExchangeTransactionItem.module.css';

// One swap-history card: provider · date + status header, then a full line
// per side of the swap (icon with chain badge, symbol over chain name,
// amount on the right) joined by a down-arrow connector. Each coin owns a
// whole line, so long chain names never truncate.
const ExchangeTransactionItem = ({transaction, onPress}) => {
  const {from, to} = useSwapCoinDisplay(transaction);

  const providerTitle =
    transaction?.metadata?.providerTitle || transaction?.provider || '';
  const dateLabel = transaction?.created_at
    ? dayjs(transaction.created_at).format('DD MMM YYYY, hh:mm A')
    : null;
  const metaLine = [providerTitle, dateLabel].filter(Boolean).join(' · ');
  const fromAmount = truncateExchangeAmount(transaction?.from_amount);
  const toAmount = truncateExchangeAmount(transaction?.to_amount);

  const renderCoinRow = (side, amountText, amountClassName) => (
    <div className={s.coinRow}>
      <SwapCoinIcon
        icon={side.icon}
        symbol={side.symbol}
        chainName={side.chainName}
        size={34}
      />
      <div className={s.coinTextBox}>
        <span className={s.coinSymbol}>{side.symbol || '—'}</span>
        {!!side.chainDisplayName && (
          <span className={s.coinChain}>{side.chainDisplayName}</span>
        )}
      </div>
      {!!amountText && <span className={amountClassName}>{amountText}</span>}
    </div>
  );

  return (
    <button className={s.card} onClick={() => onPress?.(transaction)}>
      <div className={s.headerRow}>
        <span className={s.headerMeta}>{metaLine}</span>
        <ExchangeStatusBadge status={transaction?.status} small />
      </div>
      <div className={s.divider} />
      {renderCoinRow(
        from,
        fromAmount ? `-${fromAmount} ${from.symbol || ''}` : '',
        s.sentAmount,
      )}
      <div className={s.connectorRow}>
        <ArrowDownwardIcon className={s.connectorIcon} />
      </div>
      {renderCoinRow(
        to,
        toAmount ? `+${toAmount} ${to.symbol || ''}` : '',
        s.receivedAmount,
      )}
    </button>
  );
};

export default React.memo(ExchangeTransactionItem);
