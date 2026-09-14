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
  // Connectivity: axios / fetch / WalletConnect relay. The bare fetch
  // failures are anchored: Sentry matches strings by substring, and the app
  // throws real errors that start with "Failed to fetch ..." (Drive backup).
  'Network Error',
  'Network request failed',
  /^Failed to fetch$/,
  /^Load failed$/,
  /NetworkError when attempting to fetch resource/,
  /^timeout of \d+ms exceeded/,
  /Request failed with status code/,
  /No matching key/,
  /Socket stalled/,
  /WebSocket connection (closed|failed)/i,
  /pairing topic .* expired/i,
  // @walletconnect/core 2.20.1 relayer: an inner rejection escapes its async
  // Promise executor when the relay socket closes mid-subscribe. The relayer
  // reconnects on its own; the event has no app frames.
  /Connection interrupted while trying to subscribe/,
  // Browser: stale deploy chunks and layout observers.
  /Loading chunk \d+ failed/,
  /Failed to fetch dynamically imported module/,
  // react-dom's stylesheet preload promise rejects with the raw ErrorEvent
  // when a CSS chunk fails to load (stale deploy, offline). Same family as
  // the chunk-load failures above.
  /Event `Event` \(type=error\) captured as promise rejection/,
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
