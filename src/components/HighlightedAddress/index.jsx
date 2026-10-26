'use client';

import React from 'react';
import {
  ADDRESS_HIGHLIGHT_LENGTH,
  EVM_ADDRESS_PREFIX_HIGHLIGHT_LENGTH,
} from 'src/data/constants';
import s from './HighlightedAddress.module.css';

// Full address with its start and end tinted in the theme color — the parts
// users compare when verifying an address. 0x (EVM) addresses get two extra
// leading characters so the prefix itself doesn't eat into the check.
const HighlightedAddress = ({address, className}) => {
  const prefixLength = address?.startsWith?.('0x')
    ? EVM_ADDRESS_PREFIX_HIGHLIGHT_LENGTH
    : ADDRESS_HIGHLIGHT_LENGTH;
  const suffixLength = ADDRESS_HIGHLIGHT_LENGTH;

  if (
    typeof address !== 'string' ||
    address.length <= prefixLength + suffixLength
  ) {
    return <span className={className}>{address}</span>;
  }

  return (
    <span className={className}>
      <span className={s.highlight}>{address.slice(0, prefixLength)}</span>
      {address.slice(prefixLength, -suffixLength)}
      <span className={s.highlight}>{address.slice(-suffixLength)}</span>
    </span>
  );
};

export default HighlightedAddress;
