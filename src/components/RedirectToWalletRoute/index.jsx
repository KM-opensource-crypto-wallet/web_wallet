'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useSelector} from 'react-redux';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

const RedirectToWalletRoute = ({suffix}) => {
  const router = useRouter();
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);

  useEffect(() => {
    if (currentWalletClientId) {
      router.replace(`/wallet/${currentWalletClientId}${suffix}`);
    }
  }, [currentWalletClientId, suffix, router]);

  return null;
};

export default RedirectToWalletRoute;
