// Type tabs on the coin's Transactions screen. useTransaction narrows this
// list per chain (Tron has no Batch, Solana only staking types, and so on).
export const ALL_TRANSACTION_TYPES = [
  {label: 'All', value: 'all'},
  {label: 'Regular', value: 'regular'},
  {label: 'Stake', value: 'stake'},
  {label: 'Unstake', value: 'unstake'},
  {label: 'Withdraw', value: 'withdraw'},
  {label: 'Batch', value: 'batch'},
];

// Chains that only show the "All" tab (Bitcoin-family chains are handled
// separately with isBitcoinChain).
export const ALL_ONLY_CHAINS = [
  'ton',
  'stellar',
  'aptos',
  'cardano',
  'cosmos',
  'filecoin',
  'hedera',
  'polkadot',
  'ripple',
  'tezos',
  'thorchain',
  'bitcoin_lightning',
  'litecoin',
  'dogecoin',
  'bitcoin_cash',
];
