import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {
  selectCurrentCoin,
  selectCurrentWalletClientId,
  selectUserCoins,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getCoinSlug} from 'utils/common';
import {coinRoutes, walletRoutes} from 'utils/routes';

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
          walletRoutes.swapHistoryDetails(currentWalletClientId, transactionId),
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
        // Open the coin the transaction was sent from, not the selected one:
        // a batch is confirmed outside /send/[coinSlug], so the selected coin
        // can be any coin, while the send stores the tx on the batch's first
        // item coin. The [coinSlug] layout makes the URL's coin current, so
        // the page fetches and reads the tx on that same coin.
        const state = store.getState();
        const txCoinId = params.transaction.currentCoin?._id;
        const txCoin =
          txCoinId &&
          selectUserCoins(state).find(coin => coin?._id === txCoinId);
        const coinSlug = getCoinSlug(txCoin || selectCurrentCoin(state));
        navigatorRef(
          coinRoutes.transactionDetails(currentWalletClientId, coinSlug, link),
        );
      }
    }
  },
};
