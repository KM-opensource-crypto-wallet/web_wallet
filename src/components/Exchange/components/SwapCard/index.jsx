'use client';

import React from 'react';
import {CircularProgress} from '@mui/material';
import CoinSelectorTrigger from '../CoinSelectorTrigger';
import s from './SwapCard.module.css';

// One half of the swap form: "You pay" (editable) or "You receive"
// (read-only). Renders the amount, its fiat value, the coin pill and an
// optional balance line; quick-amount chips are passed as children.
const SwapCard = ({
  label,
  coinOption,
  amount,
  fiatValue,
  balanceText,
  isBalanceFetching = false,
  editable = false,
  onChangeAmount,
  onPressCoin,
  isFetching = false,
  hasError = false,
  children,
}) => {
  return (
    <div className={s.card}>
      <div className={s.headerRow}>
        <p className={s.label}>{label}</p>
        {isBalanceFetching ? (
          <CircularProgress size={14} sx={{color: 'var(--gray)'}} />
        ) : (
          !!balanceText && <p className={s.balance}>{balanceText}</p>
        )}
      </div>
      <div className={s.mainRow}>
        <div className={s.amountBox}>
          {isFetching ? (
            <CircularProgress size={20} sx={{color: 'var(--background)'}} />
          ) : (
            <input
              className={`${s.amountInput} ${hasError ? s.amountError : ''}`}
              value={amount}
              onChange={event => onChangeAmount?.(event.target.value)}
              readOnly={!editable}
              placeholder='0'
              inputMode='decimal'
              autoComplete='off'
            />
          )}
          {!!fiatValue && !isFetching && (
            <p className={s.fiatText}>{fiatValue}</p>
          )}
        </div>
        <CoinSelectorTrigger option={coinOption} onPress={onPressCoin} />
      </div>
      {children}
    </div>
  );
};

export default SwapCard;
