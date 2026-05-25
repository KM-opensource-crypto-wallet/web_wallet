import {store} from 'src/redux/store';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';

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
    if (name === 'TransactionDetails') {
      const link = params?.transaction?.link;
      if (link) {
        if (params) {
          store.dispatch(setRouteStateData({[name]: params}));
        }
        navigatorRef(`/home/transactions/${encodeURIComponent(link)}`);
      }
    }
  },
};
