import {
  selectAllWallets,
  selectCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {walletRoutes} from 'utils/routes';

export const RESET_WALLET_ROUTE = '/auth/reset-wallet';

// A redirectRoute is only ever a path on this origin (AppRouting writes the
// current pathname), but the query string is attacker-controllable: an
// absolute, protocol-relative (`//host`) or `javascript:` value would turn the
// login into an open redirect. Anything that does not resolve to this origin
// is ignored.
const sameOriginUrl = raw => {
  const origin = typeof window === 'undefined' ? null : window.location?.origin;
  if (!raw || !origin) {
    return null;
  }
  try {
    const url = new URL(raw, origin);
    return url.origin === origin ? url : null;
  } catch {
    return null;
  }
};

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
  // Re-serialised, never interpolated: the values are decoded, so a `&`, `=`
  // or `#` inside one would otherwise split it into new params.
  const forwarded = new URLSearchParams(searchParams ?? undefined);
  forwarded.delete('redirectRoute');
  const redirectUrl = sameOriginUrl(searchParams?.get('redirectRoute'));
  if (redirectUrl) {
    forwarded.forEach((value, key) =>
      redirectUrl.searchParams.append(key, value),
    );
    return {
      route: `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`,
      hasWallet: true,
      replayed: true,
    };
  }
  const base = walletRoutes.home(selectCurrentWalletClientId(state));
  const searchParamsString = forwarded.toString();
  return {
    route: searchParamsString ? `${base}?${searchParamsString}` : base,
    hasWallet: true,
    replayed: false,
  };
};
