'use client';
import React, {useEffect} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {
  selectAllWallets,
  selectCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {setCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {isReduxStoreLoaded} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';

export default function WalletScopedLayout({children}) {
  const {clientId} = useParams();
  const router = useRouter();
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
    if (clientId !== currentWalletClientId) {
      dispatch(setCurrentWalletClientId(clientId));
    }
  }, [
    clientId,
    allWallets,
    currentWalletClientId,
    isStoreLoaded,
    dispatch,
    router,
  ]);

  return children;
}
