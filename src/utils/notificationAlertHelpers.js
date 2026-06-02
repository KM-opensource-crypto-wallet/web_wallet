export const MAX_ALERTS = 20;
export const FIFTEEN_MIN_MS = 15 * 60 * 1000;
export const MIN_USD_AMOUNT = 10;

export const coinKey = (walletClientId, coinId) =>
  `${walletClientId}_${coinId}`;

export const truncateAddress = address => {
  if (!address || address.length <= 16) return address || '';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

export const isEVMChain = chain =>
  [
    'ethereum',
    'binance_smart_chain',
    'polygon',
    'avalanche',
    'arbitrum',
    'optimism',
    'base',
  ].includes(chain);

export const isBitcoinChain = chain =>
  ['bitcoin', 'bitcoin_cash', 'litecoin'].includes(chain);

export const getDefaultMinAmount = coin => {
  const rate = coin?.currencyRate || coin?.currency_rate || 1;
  const amount = MIN_USD_AMOUNT / rate;
  return String(parseFloat(amount.toFixed(Math.min(coin?.decimal ?? 6, 8))));
};

export const isAmountBelowThreshold = (amount, coin) => {
  if (!amount) return true;
  const rate = coin?.currencyRate || coin?.currency_rate || 1;
  return parseFloat(amount) * rate < MIN_USD_AMOUNT;
};

export const buildAddressOptions = coin => {
  const addrs = [];
  if (coin?.address) addrs.push(coin.address);
  if (Array.isArray(coin?.addresses)) {
    coin.addresses.forEach(a => {
      if (a && !addrs.includes(a)) addrs.push(a);
    });
  }
  return addrs.map(a => ({label: truncateAddress(a), value: a}));
};

export const directionLabel = alert => {
  if (alert.notifyOnReceive && alert.notifyOnSend) return 'both';
  if (alert.notifyOnReceive) return 'receive';
  if (alert.notifyOnSend) return 'send';
  return '';
};
