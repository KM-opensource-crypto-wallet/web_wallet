'use client';

import React from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddressTypeBadge from 'components/AddressTypeBadge';
import {
  getCustomizePublicAddress,
  isBitcoinChain,
} from 'dok-wallet-blockchain-networks/helper';
import {formatDeriveAddressBalance} from 'dok-wallet-blockchain-networks/helper/deriveAddressBalance';
import s from './AddressSelectorTrigger.module.css';

// Closed state of the address picker: a field sized like the SelectInput box
// it replaces (50px tall with one line; it only grows when a bitcoin balance
// adds a second line), showing the selected address with its type badge.
// Clicking it should present an AddressSelectorSheet.
const AddressSelectorTrigger = ({
  title,
  titleClassName,
  chain_name,
  item,
  symbol,
  decimal,
  fallbackAddress,
  onPress,
}) => {
  const address = item?.address || fallbackAddress;
  const showBalance = isBitcoinChain(chain_name) && !!item;
  return (
    <div>
      {!!title && (
        <p className={`${s.title} ${titleClassName || ''}`}>{title}</p>
      )}
      <button
        type='button'
        className={s.field}
        onClick={onPress}
        aria-label={address ? `Change address, ${address}` : 'Select address'}>
        {/* Address + type on line 1, balance on line 2: the shortened
            address is never clipped by its neighbours. */}
        <span className={s.leftColumn}>
          <span className={s.leftRow}>
            <span className={s.addressText} title={address}>
              {getCustomizePublicAddress(address) || 'Select address'}
            </span>
            <AddressTypeBadge chain_name={chain_name} item={item} />
          </span>
          {showBalance && (
            <span className={s.balanceText}>
              {formatDeriveAddressBalance({
                balance: item?.balance,
                decimal,
                symbol,
              })}
            </span>
          )}
        </span>
        <KeyboardArrowDownIcon sx={{fontSize: 22, color: 'var(--gray)'}} />
      </button>
    </div>
  );
};

export default AddressSelectorTrigger;
