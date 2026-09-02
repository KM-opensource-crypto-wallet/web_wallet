'use client';
import {useParams} from 'next/navigation';
import RedirectToWalletRoute from 'components/RedirectToWalletRoute';

export default function TransactionDetailsPage() {
  const {txHash} = useParams();

  return (
    <RedirectToWalletRoute
      suffix={`/home/transactions/${encodeURIComponent(txHash)}`}
    />
  );
}
