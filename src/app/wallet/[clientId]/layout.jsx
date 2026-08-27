'use client';
import React, {useEffect} from 'react';
import {useParams, usePathname, useRouter} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {
  selectAllWallets,
  selectCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {setCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {isReduxStoreLoaded} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';

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

  useEffect(() => {
    if (!isStoreLoaded) {
      return;
    }
    const walletExists = allWallets?.some(
      wallet => wallet?.clientId === clientId,
    );
    if (!walletExists) {
      router.replace('/home');
      return;
    }
    // next.config.js sets trailingSlash: true, so pathname ends in '/' - strip
    // it before comparing against the plain suffixes above.
    const normalizedPathname = pathname?.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
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
    isStoreLoaded,
    dispatch,
    router,
  ]);

  return children;
}
