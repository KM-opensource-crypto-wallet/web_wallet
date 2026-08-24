'use client';

import React from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddressTypeBadge from 'components/AddressTypeBadge';
import {
  getCustomizePublicAddress,
  isBitcoinChain,
} from 'dok-wallet-blockchain-networks/helper';
import s from './AddressSelectorTrigger.module.css';

// Closed state of the address picker: a field sized like the SelectInput box
// it replaces, showing the selected address with its type badge (and balance
// for bitcoin chains). Clicking it should present an AddressSelectorSheet.
const AddressSelectorTrigger = ({
  title,
  titleClassName,
  chain_name,
  item,
  symbol,
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
        <span className={s.leftRow}>
          <span className={s.addressText} title={address}>
            {getCustomizePublicAddress(address) || 'Select address'}
          </span>
          <AddressTypeBadge chain_name={chain_name} item={item} />
        </span>
        {showBalance && (
          <span className={s.balanceText}>
            {`${item?.balance || 0} ${symbol || ''}`}
          </span>
        )}
        <KeyboardArrowDownIcon sx={{fontSize: 22, color: 'var(--gray)'}} />
      </button>
    </div>
  );
};

export default AddressSelectorTrigger;
