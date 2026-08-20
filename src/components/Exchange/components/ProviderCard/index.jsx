'use client';

import React from 'react';
import s from './ProviderCard.module.css';

// One provider row: logo, name and minimum on the left; the amount you'd
// receive (with fiat value) on the right. The best rate gets a badge,
// others show how far behind they are. Rows the entered amount doesn't
// qualify for are greyed out and disabled, with the minimum highlighted so
// the user knows what amount would unlock them.
const ProviderCard = ({row, fromSymbol, toSymbol, fiatSymbol, onPress}) => {
  const disabled = row.isBelowMinimum || !row.toAmount;
  const minText = row.minAmount
    ? `Min ${row.minAmount} ${fromSymbol || ''}${
        row.minAmountFiat ? ` (~${fiatSymbol}${row.minAmountFiat})` : ''
      }`
    : 'No minimum reported';

  return (
    <button
      type='button'
      className={`${s.card} ${row.isSelected ? s.cardSelected : ''} ${
        disabled ? s.cardDisabled : ''
      }`}
      disabled={disabled}
      onClick={() => onPress?.(row)}
      aria-pressed={row.isSelected}>
      <div className={s.logoBox}>
        {!!row.src && <img src={row.src} alt='' className={s.logo} />}
      </div>
      <div className={s.infoBox}>
        <div className={s.titleRow}>
          <p className={s.title}>{row.title}</p>
          {row.isBest && <span className={s.bestBadge}>BEST RATE</span>}
        </div>
        <p
          className={`${s.minText} ${row.isBelowMinimum ? s.minTextWarning : ''}`}>
          {minText}
        </p>
      </div>
      <div className={s.amountBox}>
        {row.toAmount ? (
          <>
            <p
              className={s.amountText}>{`${row.toAmount} ${toSymbol || ''}`}</p>
            {!!row.toAmountFiat && (
              <p
                className={
                  s.amountFiat
                }>{`~${fiatSymbol}${row.toAmountFiat}`}</p>
            )}
            {!!row.percentDiffFromBest && (
              <p className={s.percentDiff}>{`${row.percentDiffFromBest}%`}</p>
            )}
          </>
        ) : (
          <p className={s.amountUnavailable}>
            {row.isBelowMinimum ? 'Amount too low' : 'No quote'}
          </p>
        )}
      </div>
    </button>
  );
};

export default ProviderCard;
