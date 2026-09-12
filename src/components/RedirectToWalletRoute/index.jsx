'use client';
import {useEffect} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useSelector} from 'react-redux';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

const RedirectToWalletRoute = ({suffix, preserveQuery}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);

  useEffect(() => {
    if (currentWalletClientId) {
      const query = preserveQuery ? searchParams.toString() : '';
      router.replace(
        `/wallet/${currentWalletClientId}${suffix}${query ? `?${query}` : ''}`,
      );
    }
  }, [currentWalletClientId, suffix, preserveQuery, searchParams, router]);

  return null;
};

export default RedirectToWalletRoute;
