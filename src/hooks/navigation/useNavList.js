import {useMemo} from 'react';
import {usePathname} from 'next/navigation';
import sidebarList from 'src/data/lists/sidebarList';
import {publicRoutes, getActiveNavSegment} from 'utils/common';
import useWallet from 'src/hooks/wallet/useWallet';

// App navigation shared by the desktop header and the mobile drawer: the
// sidebar list minus providers this white-label doesn't offer, plus whether
// the current route shows navigation at all (not on auth/landing/public pages).
export const useNavList = () => {
  const path = usePathname();
  const pathname = getActiveNavSegment(path);

  const {
    cryptoProviders: buyCryptoProvider,
    sellCryptoAllProviders: sellCryptoProvider,
    exchangeProviders: exchangeCryptoProvider,
    currentWalletClientId,
  } = useWallet();

  const navList = useMemo(
    () =>
      sidebarList(currentWalletClientId).filter(item => {
        if (item.key === 'buyCrypto') return buyCryptoProvider.length > 0;
        if (item.key === 'sellCrypto') return sellCryptoProvider.length > 0;
        if (item.key === 'swap') return exchangeCryptoProvider.length > 0;
        return true;
      }),
    [
      currentWalletClientId,
      buyCryptoProvider.length,
      exchangeCryptoProvider.length,
      sellCryptoProvider.length,
    ],
  );

  const showNav =
    pathname !== '/auth' &&
    pathname !== '/' &&
    !publicRoutes.includes(pathname);

  return {navList, showNav, pathname};
};

export default useNavList;
