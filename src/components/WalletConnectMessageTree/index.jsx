'use client';

import React, {useState} from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {copyToClipboard} from 'utils/copyToClipboard';
import {
  decodeEvmCalldata,
  UNDECODABLE_CALLDATA_WARNING,
} from 'dok-wallet-blockchain-networks/helper/evmCalldata';
import s from './WalletConnectMessageTree.module.css';

// Structured rendering of a WalletConnect request payload: nested objects and
// arrays become collapsible sections, primitives become copyable rows. Used by
// the transaction modal for sign requests and for decoded batch-call data.

export const formatKeyLabel = key => {
  if (typeof key !== 'string') {
    return String(key);
  }
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
  return spaced.replace(/\b\w/g, char => char.toUpperCase());
};

export const stringifyPrimitive = value => {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
};

const COPIED_TITLE = 'Copied to clipboard';

export const MessageValueRow = ({label, value}) => {
  const stringValue = stringifyPrimitive(value);
  const isCopyable = typeof value === 'string' && value.length > 0;

  const onCopy = () => {
    if (isCopyable) {
      copyToClipboard(stringValue, COPIED_TITLE);
    }
  };

  return (
    <button
      type='button'
      className={s.msgRow}
      disabled={!isCopyable}
      onClick={onCopy}>
      {!!label && <span className={s.msgRowLabel}>{label}</span>}
      <span className={s.msgRowValueWrap}>
        <span className={s.msgRowValue} title={stringValue}>
          {stringValue}
        </span>
        {isCopyable && (
          <ContentCopyIcon className={s.msgCopyIcon} sx={{fontSize: 14}} />
        )}
      </span>
    </button>
  );
};

export const MessageNode = ({label, value, depth = 0}) => {
  const [expanded, setExpanded] = useState(true);
  const isArray = Array.isArray(value);
  const isObject = !isArray && value !== null && typeof value === 'object';

  if (!isArray && !isObject) {
    return <MessageValueRow label={label} value={value} />;
  }

  const entries = isArray
    ? value.map((item, index) => [`#${index + 1}`, item])
    : Object.entries(value);
  const count = entries.length;
  const countLabel = isArray
    ? `${count} item${count === 1 ? '' : 's'}`
    : `${count} field${count === 1 ? '' : 's'}`;
  const isRoot = label == null;

  const children = (
    <div className={isRoot ? undefined : s.msgNestedContainer}>
      {entries.map(([key, val], index) => (
        <React.Fragment key={key}>
          {index > 0 && <div className={s.msgDivider} />}
          <MessageNode
            label={isArray ? key : formatKeyLabel(key)}
            value={val}
            depth={depth + 1}
          />
        </React.Fragment>
      ))}
      {count === 0 && <p className={s.msgEmptyText}>{'Empty'}</p>}
    </div>
  );

  if (isRoot) {
    return children;
  }

  const Chevron = expanded ? ExpandLessIcon : ExpandMoreIcon;
  return (
    <div className={s.msgSection}>
      <button
        type='button'
        className={s.msgSectionHeader}
        aria-expanded={expanded}
        onClick={() => setExpanded(prev => !prev)}>
        <span className={s.msgRowLabel}>{label}</span>
        <span className={s.msgRowValueWrap}>
          <span className={s.msgSectionCount}>{countLabel}</span>
          <Chevron sx={{fontSize: 16, color: 'var(--gray)'}} />
        </span>
      </button>
      {expanded && children}
    </div>
  );
};

// Calldata of one EVM call: decoded method + arguments when the selector is a
// known ERC-20/721/1155 function, otherwise the raw selector/calldata behind a
// warning. `rowClassName`/`labelClassName`/`valueClassName` let the caller
// match its own detail-row styling for the "Method" line.
export const BatchCallDataView = ({
  call,
  rowClassName,
  labelClassName,
  valueClassName,
}) => {
  const decoded = decodeEvmCalldata(call?.data);
  if (decoded.kind === 'empty') {
    return null;
  }
  if (decoded.kind === 'decoded') {
    return (
      <>
        <div className={rowClassName}>
          <p className={labelClassName}>{'Method'}</p>
          <p className={valueClassName}>
            {`${decoded.method} (${decoded.standard})`}
          </p>
        </div>
        <MessageNode label={'Arguments'} value={decoded.args} depth={1} />
      </>
    );
  }
  return (
    <>
      <div className={s.calldataWarning}>
        <WarningAmberIcon sx={{fontSize: 16, color: 'var(--warning)'}} />
        <p className={s.calldataWarningText}>{UNDECODABLE_CALLDATA_WARNING}</p>
      </div>
      {!!decoded.selector && (
        <MessageValueRow label={'Selector'} value={decoded.selector} />
      )}
      <MessageValueRow label={'Calldata'} value={decoded.data} />
    </>
  );
};
