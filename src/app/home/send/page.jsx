'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useSelector} from 'react-redux';
import {
  selectCurrentCoin,
  selectCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getCoinSlug} from 'utils/common';

export default function SendPage() {
  const router = useRouter();
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const currentCoin = useSelector(selectCurrentCoin);

  useEffect(() => {
    if (currentWalletClientId && currentCoin) {
      router.replace(
        `/wallet/${currentWalletClientId}/home/send/${getCoinSlug(currentCoin)}`,
      );
    }
  }, [currentWalletClientId, currentCoin, router]);

  return null;
}
