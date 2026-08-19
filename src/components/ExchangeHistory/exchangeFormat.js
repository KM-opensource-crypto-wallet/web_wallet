// Formatting helpers shared by the exchange history list and details screens.
import {PrivateKeyList} from 'dok-wallet-blockchain-networks/helper';

export const EXCHANGE_STATUS_CONFIG = {
  pending: {label: 'Pending', color: '#D97706'},
  completed: {label: 'Completed', color: '#16A34A'},
  failed: {label: 'Failed', color: '#DC2626'},
  expired: {label: 'Expired', color: '#6B7280'},
  refunded: {label: 'Refunded', color: '#2563EB'},
};

export const TERMINAL_EXCHANGE_STATUSES = [
  'completed',
  'failed',
  'expired',
  'refunded',
];

export const truncateExchangeAmount = amount => {
  if (amount === null || amount === undefined || amount === '') {
    return '';
  }
  const num = parseFloat(amount);
  if (isNaN(num)) {
    return '';
  }
  if (num === 0) {
    return '0';
  }
  const abs = Math.abs(num);
  if (abs < 0.000001) {
    return num.toExponential(2);
  }
  if (abs < 1) {
    return parseFloat(num.toFixed(6)).toString();
  }
  if (abs < 1000) {
    return parseFloat(num.toFixed(4)).toString();
  }
  return parseFloat(num.toFixed(2)).toString();
};

export const exchangePairLabel = transaction =>
  `${transaction?.from_currency?.toUpperCase() || '—'} → ${
    transaction?.to_currency?.toUpperCase() || '—'
  }`;

// Chain identity of a swap. metadata.fromChainName/toChainName are always
// canonical chain_name values when present; the top-level from_network/
// to_network fields are canonical on new records but may hold a legacy
// symbol on very old ones, so metadata wins.
export const getExchangeChainNames = transaction => ({
  fromChainName:
    transaction?.metadata?.fromChainName || transaction?.from_network || '',
  toChainName:
    transaction?.metadata?.toChainName || transaction?.to_network || '',
});

// PrivateKeyList is the app's most complete chain_name → display-name list
// (covers non-token chains like the bitcoin variants that ModalAddTokenList
// omits). Built lazily once.
let chainDisplayNameMap = null;
export const getChainDisplayName = chainName => {
  if (!chainName) {
    return '';
  }
  if (!chainDisplayNameMap) {
    chainDisplayNameMap = {};
    for (const item of PrivateKeyList) {
      chainDisplayNameMap[item.value] = item.label;
    }
  }
  return chainDisplayNameMap[chainName.toLowerCase()] || '';
};
