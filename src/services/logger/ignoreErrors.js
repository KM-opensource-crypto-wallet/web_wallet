// Exceptions that are expected behaviour, not defects. They are still visible
// as `*/rejected` breadcrumbs and `dokapi.failed` logs; only the issue is
// suppressed. Keep this list short and grow it from real dashboard noise.
//
// `HEDERA_KEY_MISMATCH_MESSAGE` is duplicated from
// dok-wallet-blockchain-networks/helper on purpose: importing the helper here
// would pull rpcUrls -> dokApi -> config/config.js (bitcoinjs, Stellar) into
// the pre-hydration client bundle and the edge bundle. ignoreErrors.test.js
// keeps the two strings in sync.
const HEDERA_KEY_MISMATCH_MESSAGE =
  'This Hedera account is controlled by a different key than this wallet, so it cannot sign transactions.';

export const ignoreErrors = [
  // Connectivity: axios / fetch / WalletConnect relay.
  'Network Error',
  'Network request failed',
  /^timeout of \d+ms exceeded/,
  /Request failed with status code/,
  /No matching key/,
  /Socket stalled/,
  /WebSocket connection (closed|failed)/i,
  /pairing topic .* expired/i,
  // Browser: stale deploy chunks and layout observers.
  /Loading chunk \d+ failed/,
  /Failed to fetch dynamically imported module/,
  /ResizeObserver loop/,
  // User choices and business rules thrown as errors by our own code.
  'transaction was cancelled',
  'User rejected.',
  'Invalid Custom Address',
  'polkadot_receiver_should_1_dot',
  HEDERA_KEY_MISMATCH_MESSAGE,
  /insufficient funds/i,
  /Insufficient token balance/i,
  // rpcUrls.js throttles itself by throwing.
  'last call made with 10 minutes',
];
