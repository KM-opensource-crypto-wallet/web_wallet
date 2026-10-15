import React, {memo} from 'react';
import s from './PriceChange.module.css';

// 24h price change of a coin (coin.priceChange24h, percent), e.g. "▲ 2.34%".
// Renders nothing when the coin has no market data, never a fake 0%.
const PriceChange = ({value, className}) => {
  const change = Number(value);
  if (value === null || value === undefined || !Number.isFinite(change)) {
    return null;
  }
  const rounded = Math.round(change * 100) / 100;
  const tone = rounded > 0 ? s.up : rounded < 0 ? s.down : s.flat;
  const arrow = rounded > 0 ? '▲' : rounded < 0 ? '▼' : '';
  return (
    <span
      className={`${s.change} ${tone} ${className || ''}`}
      title='24h price change'>
      {arrow ? (
        <span className={s.arrow} aria-hidden='true'>
          {arrow}
        </span>
      ) : null}
      <span className={s.srOnly}>
        {rounded > 0 ? 'Up ' : rounded < 0 ? 'Down ' : ''}
      </span>
      {Math.abs(rounded).toFixed(2)}%
      <span className={s.srOnly}> in 24 hours</span>
    </span>
  );
};

export default memo(PriceChange);
