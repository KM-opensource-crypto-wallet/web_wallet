'use client';
import React from 'react';
import {EXCHANGE_STATUS_CONFIG} from 'components/ExchangeHistory/exchangeFormat';
import s from './ExchangeStatusBadge.module.css';

// Dot + label pill for the unified exchange statuses
// (pending/completed/failed/expired/refunded).
const ExchangeStatusBadge = ({status, small}) => {
  const config = EXCHANGE_STATUS_CONFIG[status] || {
    label: status || '—',
    color: '#6B7280',
  };
  return (
    <div
      className={small ? `${s.badge} ${s.badgeSmall}` : s.badge}
      style={{backgroundColor: config.color + '22'}}>
      <div className={s.dot} style={{backgroundColor: config.color}} />
      <span
        className={small ? `${s.label} ${s.labelSmall}` : s.label}
        style={{color: config.color}}>
        {config.label}
      </span>
    </div>
  );
};

export default ExchangeStatusBadge;
