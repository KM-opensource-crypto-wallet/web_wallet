'use client';

import React from 'react';
import {isBitcoinChain} from 'dok-wallet-blockchain-networks/helper';
import {getDeriveAddressLabel} from 'dok-wallet-blockchain-networks/service/bitcoinHdAddress';
import s from './AddressTypeBadge.module.css';

// Per-type colors readable on both light and dark backgrounds, so they are
// literals rather than theme tokens (same approach as ConfirmationModal's
// WARN/DANGER constants).
export const ADDRESS_TYPE_CONFIG = {
  Receive: {color: '#16A34A'},
  Change: {color: '#D97706'},
  Legacy: {color: '#6B7280'},
  Custom: {color: '#2563EB'},
};

// Receive / Change / Legacy / Custom dot + tinted pill for a derive-address
// entry. Only bitcoin chains have address types, so anything else renders
// nothing.
const AddressTypeBadge = ({chain_name, item}) => {
  if (!item || !isBitcoinChain(chain_name)) {
    return null;
  }
  const label = getDeriveAddressLabel(chain_name, item);
  const color = ADDRESS_TYPE_CONFIG[label]?.color || 'var(--gray)';
  return (
    <span className={s.badge} style={{backgroundColor: `${color}22`}}>
      <span className={s.dot} style={{backgroundColor: color}} />
      <span className={s.label} style={{color}}>
        {label}
      </span>
    </span>
  );
};

export default AddressTypeBadge;
