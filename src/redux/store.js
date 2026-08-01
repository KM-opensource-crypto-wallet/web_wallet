import {
  persistStore,
  persistCombineReducers,
  createTransform,
} from 'redux-persist';
import {configureStore} from '@reduxjs/toolkit';
import {encryptTransform} from 'redux-persist-transform-encrypt';
import storage from 'redux-persist/lib/storage';
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
import {cryptoProviderSlice} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProviderSlice';
import {stakingSlice} from 'dok-wallet-blockchain-networks/redux/staking/stakingSlice';
import {messageSlice} from 'dok-wallet-blockchain-networks/redux/messages/messageSlice';
import {sellCryptoSlice} from 'dok-wallet-blockchain-networks/redux/sellCrypto/sellCryptoSlice';
import {batchTransactionSlice} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSlice';
import {customRpcSlice} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSlice';
import {coinSyncSlice} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSlice';
import {sentAddressHistorySlice} from 'dok-wallet-blockchain-networks/redux/sentAddressHistory/sentAddressHistorySlice';

const encryptor = encryptTransform({
  secretKey: process.env.REDUX_WEB_KEY, // Replace with your secret key
  onError: function (error) {
    console.error('Error in encrypting store', error);
    // Handle any encryption errors here
  },
});

// On persist, re-hide any wallet whose re-lock option isn't MANUAL, so it comes
// back hidden after a page reload/relaunch (web has no app-background event, so
// BACKGROUND behaves the same as RELAUNCH here). Must run before the encryptor
// on inbound so it operates on the plain wallets state.
const walletsPersistTransform = createTransform(
  inboundState => ({
    ...inboundState,
    allWallets: inboundState?.allWallets?.map(wallet =>
      wallet?.hideSettings &&
      wallet.hideSettings.relockOption !== RELOCK_OPTIONS.MANUAL
        ? {...wallet, hideSettings: {...wallet.hideSettings, isHidden: true}}
        : wallet,
    ),
  }),
  outboundState => outboundState,
  {whitelist: [walletsSlice.name]},
);

const persistConfig = {
  key: 'root', // Change this to your preferred storage key
  storage,
  transforms: [walletsPersistTransform, encryptor], // Apply the encryption transformation
  blacklist: [
    currentTransferSlice.name,
    exchangeSlice.name,
    currencySlice.name,
    extraDataSlice.name,
    walletConnectSlice.name,
    cryptoProviderSlice.name,
    coinSyncSlice.name,
    stakingSlice.name,
  ],
};

const rootReducer = persistCombineReducers(persistConfig, {
  [authSlice.name]: authSlice.reducer,
  [walletsSlice.name]: walletsSlice.reducer,
  [currencySlice.name]: currencySlice.reducer,
  [extraDataSlice.name]: extraDataSlice.reducer,
  [settingsSlice.name]: settingsSlice.reducer,
  [currentTransferSlice.name]: currentTransferSlice.reducer,
  [walletConnectSlice.name]: walletConnectSlice.reducer,
  [exchangeSlice.name]: exchangeSlice.reducer,
  [cryptoProviderSlice.name]: cryptoProviderSlice.reducer,
  [stakingSlice.name]: stakingSlice.reducer,
  [messageSlice.name]: messageSlice.reducer,
  [sellCryptoSlice.name]: sellCryptoSlice.reducer,
  [batchTransactionSlice.name]: batchTransactionSlice.reducer,
  [customRpcSlice.name]: customRpcSlice.reducer,
  [coinSyncSlice.name]: coinSyncSlice.reducer,
  [sentAddressHistorySlice.name]: sentAddressHistorySlice.reducer,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
  devTools: true,
});

const persistor = persistStore(store, null, () => {
  setTimeout(() => {
    store.dispatch(setReduxStoreLoaded(true));
  }, 500);
});

export {persistor, store};
