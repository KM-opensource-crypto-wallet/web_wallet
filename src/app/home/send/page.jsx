'use client';
import {useSelector} from 'react-redux';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getCoinSlug} from 'utils/common';
import RedirectToWalletRoute from 'components/RedirectToWalletRoute';

export default function SendPage() {
  const currentCoin = useSelector(selectCurrentCoin);

  if (!currentCoin) {
    return null;
  }

  return (
    <RedirectToWalletRoute suffix={`/home/send/${getCoinSlug(currentCoin)}`} />
  );
}
