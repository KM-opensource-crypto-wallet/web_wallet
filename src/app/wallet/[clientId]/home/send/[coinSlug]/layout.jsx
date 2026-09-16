'use client';
import React, {useEffect} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {
  selectAllWallets,
  selectCurrentCoin,
  selectCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  refreshCurrentCoin,
  setCurrentCoin,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {isReduxStoreLoaded} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import Loading from 'components/Loading';
import {findCoinBySlug, getCoinSlug} from 'utils/common';
import {walletRoutes} from 'utils/routes';

// Coin guard for every page under /wallet/[clientId]/home/send/[coinSlug].
// Makes the slug in the URL the source of truth for the selected coin:
// validates it against the wallet, syncs redux, and only then renders the
// page so nothing fetches or paints against the previously selected coin.
//
// Companion to the wallet guard in ../../../layout.jsx. None of that layout's
// NON_ACTIVATING_ROUTE_SUFFIXES may ever live under [coinSlug]: this guard
// waits for the wallet to become active and would otherwise never resolve.
export default function CoinScopedLayout({children}) {
  const {clientId, coinSlug} = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const isStoreLoaded = useSelector(isReduxStoreLoaded);
  const allWallets = useSelector(selectAllWallets);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const currentCoin = useSelector(selectCurrentCoin);

  const isCoinSynced = getCoinSlug(currentCoin) === coinSlug;

  useEffect(() => {
    if (!isStoreLoaded) {
      return;
    }
    // Look the wallet up by the URL id rather than via selectCurrentWallet:
    // child effects run before parent effects, so on a cross-wallet deep link
    // the parent layout has not activated this wallet yet on the first pass.
    const wallet = allWallets?.find(item => item?.clientId === clientId);
    if (!wallet) {
      return; // the wallet layout redirects to /home
    }
    const visibleCoins = wallet.coins?.filter(coin => coin?.isInWallet);
    const matchedCoin = findCoinBySlug(visibleCoins, coinSlug);
    if (!matchedCoin) {
      router.replace(walletRoutes.home(clientId));
      return;
    }
    // setCurrentCoin acts on the *current* wallet and throws on an unknown
    // id, so wait until the parent layout has made this wallet current.
    if (currentWalletClientId !== clientId) {
      return;
    }
    // Compare by slug, not _id: a wallet may hold two coins with the same
    // slug and the user may have picked the second one from Home.
    if (getCoinSlug(currentCoin) !== coinSlug) {
      dispatch(setCurrentCoin(matchedCoin._id));
      // Deep links skip the Home screen, so refresh what it would have.
      dispatch(refreshCurrentCoin({currentCoin: matchedCoin}));
    }
  }, [
    clientId,
    coinSlug,
    allWallets,
    currentWalletClientId,
    currentCoin,
    isStoreLoaded,
    dispatch,
    router,
  ]);

  if (!isCoinSynced) {
    return <Loading />;
  }

  return children;
}
