'use client';
import {authRoutes, stripTrailingSlash} from 'utils/routes';
import React, {useEffect} from 'react';
import {useParams, usePathname, useRouter} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {
  selectAllWallets,
  selectCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {setCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {isReduxStoreLoaded} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import {getUserPassword} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';

// Routes that manage a wallet without making it the active one - e.g. hiding,
// scanning, or backing up another wallet from its Edit screen while a
// different wallet stays selected everywhere else in the app.
const NON_ACTIVATING_ROUTE_SUFFIXES = [
  '/home/coin-sync',
  '/wallets/hide-wallet',
  '/verify/verify-create',
  '/verify/verify-screen',
];

export default function WalletScopedLayout({children}) {
  const {clientId} = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const isStoreLoaded = useSelector(isReduxStoreLoaded);
  const allWallets = useSelector(selectAllWallets);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const hasPassword = Boolean(useSelector(getUserPassword));

  useEffect(() => {
    if (!isStoreLoaded) {
      return;
    }
    // No wallets at all (reset, or the last one deleted) while still on a
    // wallet page: the /home forwarder has nothing to resolve to, so go to
    // login, which continues to create/import. Without a password AppRouting
    // owns the onboarding redirect.
    if (!allWallets?.length) {
      if (hasPassword) {
        router.replace(authRoutes.login);
      }
      return;
    }
    const walletExists = allWallets.some(
      wallet => wallet?.clientId === clientId,
    );
    if (!walletExists) {
      router.replace('/home');
      return;
    }
    // next.config.js sets trailingSlash: true, so pathname ends in '/' - strip
    // it before comparing against the plain suffixes above.
    const normalizedPathname = stripTrailingSlash(pathname);
    const isNonActivatingRoute = NON_ACTIVATING_ROUTE_SUFFIXES.some(suffix =>
      normalizedPathname?.endsWith(suffix),
    );
    if (!isNonActivatingRoute && clientId !== currentWalletClientId) {
      dispatch(setCurrentWalletClientId(clientId));
    }
  }, [
    clientId,
    pathname,
    allWallets,
    currentWalletClientId,
    hasPassword,
    isStoreLoaded,
    dispatch,
    router,
  ]);

  return children;
}
