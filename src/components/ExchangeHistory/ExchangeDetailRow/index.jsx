'use client';
import React from 'react';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';
import {showToast} from 'utils/toast';
import {CopyIcon} from 'components/Home/HomeIcons';
import {ExternalLinkIcon} from 'components/Transactions/TxIcons';
import s from './ExchangeDetailRow.module.css';

// Label/value row for the swap details cards. `copyable` shortens the value
// and copies it on click; `onPress` (e.g. open in explorer) wins over copy.
// Rows after the first get a divider (`isFirst` skips it).
const ExchangeDetailRow = ({
  label,
  value,
  displayValue,
  copyable,
  onPress,
  isFirst,
}) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const stringValue = String(value);
  const shownValue =
    displayValue ||
    (copyable ? getCustomizePublicAddress(stringValue) : stringValue);

  const handleClick = () => {
    if (onPress) {
      onPress();
      return;
    }
    navigator.clipboard?.writeText(stringValue).then(() => {
      showToast({type: 'successToast', title: 'Copied to clipboard'});
    });
  };

  return (
    <div className={`${s.row} ${isFirst ? '' : s.rowDivider}`}>
      <span className={s.label}>{label}</span>
      {copyable || onPress ? (
        <button
          type='button'
          className={s.action}
          title={stringValue}
          aria-label={onPress ? `Open ${label}` : `Copy ${label}`}
          onClick={handleClick}>
          <span className={s.mono}>{shownValue}</span>
          {onPress ? <ExternalLinkIcon size={14} /> : <CopyIcon size={14} />}
        </button>
      ) : (
        <span className={s.value}>{shownValue}</span>
      )}
    </div>
  );
};

export default ExchangeDetailRow;
