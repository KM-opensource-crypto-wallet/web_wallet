'use client';

import React from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import s from './CoinSelectorTrigger.module.css';

// The clickable coin pill inside a SwapCard. The whole pill is the click
// target, replacing the old dropdown select.
const CoinSelectorTrigger = ({option, onPress}) => {
  const symbol = option?.options?.symbol?.toUpperCase();
  const icon = option?.options?.icon;
  const chainName = option?.options?.chain_display_name;

  return (
    <button
      type='button'
      className={s.container}
      onClick={onPress}
      aria-label={symbol ? `Change coin, ${symbol}` : 'Select coin'}>
      {!!icon && (
        <div className={s.iconBox}>
          <img src={icon} alt='' className={s.icon} />
        </div>
      )}
      <div className={s.labelBox}>
        <p className={s.symbol}>{symbol || 'Select coin'}</p>
        {!!chainName && <p className={s.chain}>{chainName}</p>}
      </div>
      <KeyboardArrowDownIcon sx={{fontSize: 18, color: 'var(--gray)'}} />
    </button>
  );
};

export default CoinSelectorTrigger;
