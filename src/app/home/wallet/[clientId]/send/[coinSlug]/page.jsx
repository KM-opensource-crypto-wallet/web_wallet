'use client';
import React, {useEffect} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {
  selectCurrentCoin,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {setCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {isReduxStoreLoaded} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import {findCoinBySlug, getCoinSlug} from 'utils/common';
import SendScreen from 'components/Send';

export default function SendWithCoinSlug() {
  const {clientId, coinSlug} = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const isStoreLoaded = useSelector(isReduxStoreLoaded);
  const currentWallet = useSelector(selectCurrentWallet);
  const currentCoin = useSelector(selectCurrentCoin);

  useEffect(() => {
    if (!isStoreLoaded) {
      return;
    }
    const matchedCoin = findCoinBySlug(currentWallet?.coins, coinSlug);
    if (!matchedCoin) {
      router.replace(`/home/wallet/${clientId}`);
      return;
    }
    if (getCoinSlug(currentCoin) !== coinSlug) {
      dispatch(setCurrentCoin(matchedCoin._id));
    }
  }, [
    clientId,
    coinSlug,
    currentWallet,
    currentCoin,
    isStoreLoaded,
    dispatch,
    router,
  ]);

  return <SendScreen />;
}
