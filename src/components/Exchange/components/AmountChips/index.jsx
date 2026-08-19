'use client';

import React from 'react';
import s from './AmountChips.module.css';

const CHIPS = [
  {label: '25%', fraction: 0.25},
  {label: '50%', fraction: 0.5},
  {label: 'MAX', fraction: 1},
];

// Quick-amount chips under the pay amount; each sets a fraction of the
// available balance.
const AmountChips = ({onSelectFraction, disabled = false}) => {
  return (
    <div className={s.row}>
      {CHIPS.map(chip => (
        <button
          type='button'
          key={chip.label}
          className={`${s.chip} ${disabled ? s.chipDisabled : ''}`}
          disabled={disabled}
          onClick={() => onSelectFraction?.(chip.fraction)}
          aria-label={`Use ${chip.label} of balance`}>
          {chip.label}
        </button>
      ))}
    </div>
  );
};

export default AmountChips;
