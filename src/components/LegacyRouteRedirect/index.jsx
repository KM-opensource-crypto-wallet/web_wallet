'use client';
import {useEffect} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {useSelector} from 'react-redux';
import {
  selectAllWallets,
  selectCurrentCoin,
  selectCurrentWallet,
  selectCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {isReduxStoreLoaded} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import {getHasAccount} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import Loading from 'components/Loading';
import {getCoinSlug} from 'utils/common';
import {resolveLegacyRoute} from 'utils/legacyRoutes';
import {authRoutes, walletRoutes} from 'utils/routes';
import {showToast} from 'utils/toast';

// Forwards any pre-/wallet/{clientId} URL (and the wallet-agnostic payment
// link) to its equivalent on the active wallet and coin. Stub pages under
// src/app/{home,buy-crypto,sell-crypto,swap,...} render only this.
//
// Waits for the store and for an active wallet. A brand-new user (no
// password) hitting a payment link is sent through registration by
// AppRouting, and CreateOrUpdateWallet replays the redirectRoute once the
// wallet exists. A user with a password but no wallets (after a reset) is
// sent to login, which continues to create/import.
// `fallbackToHome`: for paths the resolver does not recognise (the 404 page),
// go to the wallet Home instead of staying on the spinner.
const LegacyRouteRedirect = ({fallbackToHome = false}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isStoreLoaded = useSelector(isReduxStoreLoaded);
  const clientId = useSelector(selectCurrentWalletClientId);
  const hasWallets = useSelector(selectAllWallets)?.length > 0;
  const hasPassword = useSelector(getHasAccount);
  const currentWallet = useSelector(selectCurrentWallet);
  const currentCoin = useSelector(selectCurrentCoin);

  useEffect(() => {
    if (!isStoreLoaded) {
      return;
    }
    if (!hasWallets) {
      // Nothing to forward to. With a password this is a reset (or the last
      // wallet deleted); without one AppRouting owns the onboarding redirect.
      if (hasPassword) {
        router.replace(authRoutes.login);
      }
      return;
    }
    if (!clientId) {
      return;
    }
    const resolved = resolveLegacyRoute({
      pathname,
      searchParams,
      clientId,
      coins: currentWallet?.coins?.filter(coin => coin?.isInWallet),
      currentCoinSlug: getCoinSlug(currentCoin),
    });
    if (!resolved) {
      if (fallbackToHome) {
        router.replace(walletRoutes.home(clientId));
      }
      return;
    }
    if (resolved.toast) {
      showToast({type: 'errorToast', title: resolved.toast});
    }
    router.replace(
      resolved.query ? `${resolved.path}?${resolved.query}` : resolved.path,
    );
  }, [
    isStoreLoaded,
    clientId,
    hasWallets,
    hasPassword,
    fallbackToHome,
    currentWallet,
    currentCoin,
    pathname,
    searchParams,
    router,
  ]);

  return <Loading />;
};

export default LegacyRouteRedirect;
