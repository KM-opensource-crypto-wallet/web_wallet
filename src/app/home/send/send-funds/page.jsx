'use client';
import {useEffect} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useSelector} from 'react-redux';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

// Unlike every other old-URL stub (which lands on Home), this one preserves
// its query string - it's the destination of Receive Payment URL links, so
// address/amount/currency must survive the redirect for the form to prefill.
export default function SendFundsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);

  useEffect(() => {
    if (currentWalletClientId) {
      const query = searchParams.toString();
      router.replace(
        `/wallet/${currentWalletClientId}/home/send/send-funds${
          query ? `?${query}` : ''
        }`,
      );
    }
  }, [currentWalletClientId, searchParams, router]);

  return null;
}
