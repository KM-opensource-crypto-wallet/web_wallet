import {createMigrate, persistReducer, persistStore} from 'redux-persist';
import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
} from '@reduxjs/toolkit';
import {authSlice} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {
  RELOCK_OPTIONS,
  walletsSlice,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {currencySlice} from 'dok-wallet-blockchain-networks/redux/currency/currencySlice';
import {extraDataSlice} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {settingsSlice} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import {currentTransferSlice} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {
  setReduxStoreLoaded,
  walletConnectSlice,
} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSlice';
import {exchangeSlice} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';
import {exchangeHistorySlice} from 'dok-wallet-blockchain-networks/redux/exchangeHistory/exchangeHistorySlice';
import {cryptoProviderSlice} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProviderSlice';
import {stakingSlice} from 'dok-wallet-blockchain-networks/redux/staking/stakingSlice';
import {sellCryptoSlice} from 'dok-wallet-blockchain-networks/redux/sellCrypto/sellCryptoSlice';
import {batchTransactionSlice} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSlice';
import {customRpcSlice} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSlice';
import {coinSyncSlice} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSlice';
import {sentAddressHistorySlice} from 'dok-wallet-blockchain-networks/redux/sentAddressHistory/sentAddressHistorySlice';
import {
  AUTH_PERSIST_BLACKLIST,
  batchTransactionPersistTransform,
  createWalletsPersistTransform,
  sellCryptoPersistTransform,
} from 'dok-wallet-blockchain-networks/redux/storage/persistTransforms';
import {
  IMMEDIATE_VAULT_WRITE_ACTIONS,
  createVaultSync,
} from 'dok-wallet-blockchain-networks/security/vaultSync';
import {rejectedActionBreadcrumb} from './sentryMiddleware';
import {plainStorage} from './storage/plainStorage';
import {sealedStorage} from './storage/sealedStorage';
import {
  createTimedSerialize,
  getPersistTimingStats,
} from './storage/persistTiming';

// Persistence layout (docs/superpowers/specs/2026-09-19-secure-storage-final-plan.md §3):
//   plain  (IndexedDB, readable before login)  auth (no password), settings
//   sealed (AES-256-GCM under the DEK-derived state key; null until unlock)
//          wallets, sellCrypto, batchTransaction, customRpc, sentAddressHistory
//   transient (never persisted)                 everything else
// One redux-persist key per slice; wallet secrets are stripped by the wallets
// transform and live only in the vault (security/vault.js), mirrored by the
// vaultSync listener. `timeout: 0` is mandatory (the default 5 s timer would
// rehydrate initial state after a slow bootstrap and persist it over the real
// data). No `throttle`: redux-persist serialises ONE top-level field per
// throttle tick and writes a slice only once every changed field has been
// processed, so `throttle: 1000` delayed the first wallets write after load by
// ~9 s (nine fields) and a tab closed inside that window lost a new wallet
// (mobile lost one the same way). `persistFlush` below also forces the write
// on the wallet-creating actions and on resetWallet.
export const PERSIST_VERSION = 1;

export const PLAIN_SLICE_NAMES = Object.freeze([
  authSlice.name,
  settingsSlice.name,
]);
export const SEALED_SLICE_NAMES = Object.freeze([
  walletsSlice.name,
  sellCryptoSlice.name,
  batchTransactionSlice.name,
  customRpcSlice.name,
  sentAddressHistorySlice.name,
]);

const TRANSIENT_SLICES = [
  currencySlice,
  extraDataSlice,
  currentTransferSlice,
  walletConnectSlice,
  exchangeSlice,
  exchangeHistorySlice,
  cryptoProviderSlice,
  stakingSlice,
  coinSyncSlice,
];

const makePersistConfig = (slice, storage, {blacklist, transforms} = {}) => ({
  key: slice.name,
  storage,
  version: PERSIST_VERSION,
  migrate: createMigrate({}, {debug: false}),
  timeout: 0,
  ...(blacklist ? {blacklist} : {}),
  ...(transforms ? {transforms} : {}),
  // Dev only: per-slice serialize timing (R9a evidence); read with
  // getPersistTimingStats() from redux/storage/persistTiming.
  ...(process.env.NODE_ENV !== 'production'
    ? {serialize: createTimedSerialize(slice.name)}
    : {}),
});

// Exposed so the unlock flow can re-read every sealed slice with the same
// config (deserialize + outbound transforms) and dispatch persist/REHYDRATE.
export const SEALED_PERSIST_CONFIGS = {
  [walletsSlice.name]: makePersistConfig(walletsSlice, sealedStorage, {
    transforms: [
      createWalletsPersistTransform({
        manualRelockOption: RELOCK_OPTIONS.MANUAL,
      }),
    ],
  }),
  [sellCryptoSlice.name]: makePersistConfig(sellCryptoSlice, sealedStorage, {
    transforms: [sellCryptoPersistTransform],
  }),
  [batchTransactionSlice.name]: makePersistConfig(
    batchTransactionSlice,
    sealedStorage,
    {transforms: [batchTransactionPersistTransform]},
  ),
  [customRpcSlice.name]: makePersistConfig(customRpcSlice, sealedStorage),
  [sentAddressHistorySlice.name]: makePersistConfig(
    sentAddressHistorySlice,
    sealedStorage,
  ),
};

const PLAIN_PERSIST_CONFIGS = {
  [authSlice.name]: makePersistConfig(authSlice, plainStorage, {
    blacklist: AUTH_PERSIST_BLACKLIST,
  }),
  [settingsSlice.name]: makePersistConfig(settingsSlice, plainStorage),
};

const SLICES_BY_NAME = Object.fromEntries(
  [
    authSlice,
    settingsSlice,
    walletsSlice,
    sellCryptoSlice,
    batchTransactionSlice,
    customRpcSlice,
    sentAddressHistorySlice,
  ].map(slice => [slice.name, slice]),
);

const persistedReducers = Object.fromEntries(
  Object.entries({...PLAIN_PERSIST_CONFIGS, ...SEALED_PERSIST_CONFIGS}).map(
    ([name, config]) => [
      name,
      persistReducer(config, SLICES_BY_NAME[name].reducer),
    ],
  ),
);

export const rootReducer = combineReducers({
  ...persistedReducers,
  ...Object.fromEntries(
    TRANSIENT_SLICES.map(slice => [slice.name, slice.reducer]),
  ),
});

// Mirrors wallet secrets into the vault (immediately for wallet-creating
// actions, debounced otherwise); empties it on resetWallet, destroys it on
// logOutSuccess. `flush()` runs on pagehide next to persistor.flush().
export const vaultSync = createVaultSync();

// Key material must be on disk before the tab can close: the same actions the
// vault writes immediately for also flush redux-persist right away (and
// resetWallet, so an emptied wallet list is never rolled back).
// `persistor` is assigned below; the effect only runs after dispatches.
const persistFlush = createListenerMiddleware();
persistFlush.startListening({
  predicate: action =>
    IMMEDIATE_VAULT_WRITE_ACTIONS.includes(action?.type) ||
    action?.type === 'wallets/resetWallet',
  effect: async () => {
    await persistor.flush();
  },
});

const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    })
      .prepend(vaultSync.middleware, persistFlush.middleware)
      .concat(rejectedActionBreadcrumb),
  // The decrypted store (keys included) must not be inspectable in production.
  devTools: process.env.NODE_ENV !== 'production',
});

// Dev only: `window.__dokPersistTiming()` prints per-slice serialize timings
// and sizes since page load (R9 evidence).
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  window.__dokPersistTiming = getPersistTimingStats;
}

const persistor = persistStore(store, null, () => {
  setTimeout(() => {
    store.dispatch(setReduxStoreLoaded(true));
  }, 500);
});

export {persistor, store};
