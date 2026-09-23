import {
  selectAllWallets,
  selectCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {walletRoutes} from 'utils/routes';

export const RESET_WALLET_ROUTE = '/auth/reset-wallet';

/**
 * Where Login goes once the vault is unlocked.
 *
 * `state` must be read from the store AFTER `unlockWithPassword` resolved.
 * The sealed wallets slice only rehydrates during that unlock, so selector
 * values captured at render time (before the click) always say "no wallets"
 * on a fresh page load and would send an existing account to reset-wallet.
 */
export const resolvePostUnlockRoute = (state, searchParams) => {
  const allWallets = selectAllWallets(state);
  if (!allWallets?.length) {
    return {route: RESET_WALLET_ROUTE, hasWallet: false, replayed: false};
  }
  const redirectRoute = searchParams?.get('redirectRoute');
  let searchParamsString = '';
  for (const key of searchParams?.keys?.() || []) {
    if (key !== 'redirectRoute') {
      searchParamsString += `${key}=${searchParams.get(key)}&`;
    }
  }
  const base =
    redirectRoute || walletRoutes.home(selectCurrentWalletClientId(state));
  return {
    route: searchParamsString ? `${base}?${searchParamsString}` : base,
    hasWallet: true,
    replayed: Boolean(redirectRoute),
  };
};
