import {persistStore, persistCombineReducers} from 'redux-persist';
import {configureStore} from '@reduxjs/toolkit';
import {encryptTransform} from 'redux-persist-transform-encrypt';
import storage from 'redux-persist/lib/storage';
import {authSlice} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {walletsSlice} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
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

const encryptor = encryptTransform({
  secretKey: process.env.REDUX_WEB_KEY, // Replace with your secret key
  onError: function (error) {
    console.error('Error in encrypting store', error);
    // Handle any encryption errors here
  },
});

const persistConfig = {
  key: 'root', // Change this to your preferred storage key
  storage,
  transforms: [encryptor], // Apply the encryption transformation
  blacklist: [
    currentTransferSlice.name,
    exchangeSlice.name,
    currencySlice.name,
    extraDataSlice.name,
    walletConnectSlice.name,
    cryptoProviderSlice.name,
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
