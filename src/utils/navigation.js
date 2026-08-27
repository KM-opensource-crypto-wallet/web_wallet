import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

let currentRouteName = '';
let navigatorRef = null;

export const MainNavigation = {
  setCurrentRouteName: routeName => {
    currentRouteName = routeName;
  },
  getCurrentRouteName: () => {
    return currentRouteName;
  },
  setNavigator: navigateFn => {
    navigatorRef = navigateFn;
  },
  navigate: ({name, params} = {}) => {
    if (!navigatorRef) return;
    // Outside React, so the active wallet is read straight from the store.
    const {store} = require('src/redux/store');
    const currentWalletClientId = selectCurrentWalletClientId(store.getState());
    if (name === 'ExchangeTransactionDetails') {
      const transactionId = params?.transactionId;
      if (transactionId) {
        navigatorRef(
          `/wallet/${currentWalletClientId}/swap/history/${encodeURIComponent(transactionId)}`,
        );
      }
      return;
    }
    if (name === 'TransactionDetails') {
      const link = params?.transaction?.link;
      if (link) {
        if (params) {
          store.dispatch(setRouteStateData({[name]: params}));
        }
        navigatorRef(
          `/wallet/${currentWalletClientId}/home/transactions/${encodeURIComponent(link)}`,
        );
      }
    }
  },
};
