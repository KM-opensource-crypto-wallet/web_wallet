'use client';
import React from 'react';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';
import {showToast} from 'utils/toast';
import s from './ExchangeDetailRow.module.css';

// Label/value row for the details card. `copyable` shortens the value and
// copies it on click; `onPress` (e.g. open in explorer) wins over copy.
// `icon` (a React node, e.g. a MUI icon element) renders a tinted leading
// circle before the label.
const ExchangeDetailRow = ({
  label,
  value,
  displayValue,
  copyable,
  onPress,
  isFirst,
  icon,
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
    <>
      {!isFirst && <div className={s.divider} />}
      <div className={s.row}>
        <div className={s.rowLabelWrap}>
          {!!icon && <div className={s.iconCircle}>{icon}</div>}
          <span className={s.rowLabel}>{label}</span>
        </div>
        {copyable || onPress ? (
          <button className={s.rowValueRow} onClick={handleClick}>
            <span className={s.rowValue}>{shownValue}</span>
            {onPress ? (
              <OpenInNewIcon className={s.rowIcon} />
            ) : (
              <ContentCopyIcon className={s.rowIcon} />
            )}
          </button>
        ) : (
          <span className={s.rowValueStatic}>{shownValue}</span>
        )}
      </div>
    </>
  );
};

export default ExchangeDetailRow;
