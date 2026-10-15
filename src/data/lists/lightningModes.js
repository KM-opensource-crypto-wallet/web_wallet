// Ways to receive on Bitcoin Lightning. The first is selected on open and
// uses the coin's own address; the others generate one on demand.
export const LIGHTNING_MODES = [
  {value: 'lightning_address', label: 'Lightning address'},
  {value: 'invoice', label: 'Invoice'},
  {value: 'btc_mainnet', label: 'On-chain BTC'},
];
