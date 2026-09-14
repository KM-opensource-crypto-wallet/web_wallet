'use client';

import Link from 'next/link';
import s from './Header.module.css';

import {getAppLogo} from 'whitelabel/whiteLabelInfo';
const icons = require(`assets/images/icons`).default;
import React, {useContext, useEffect} from 'react';
import {ThemeContext} from 'theme/ThemeContext';
import {usePathname} from 'next/navigation';
import Image from 'next/image';
import {publicRoutes} from 'utils/common';
import {useSelector} from 'react-redux';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {walletRoutes} from 'utils/routes';

const Header = () => {
  const {themeType} = useContext(ThemeContext);
  const path = usePathname();
  const pathname = `/${path.split('/')[1]}`;
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  // Logo goes to the active wallet's Home; before a wallet exists the legacy
  // /home forwarder resolves it once one does.
  const homeHref = currentWalletClientId
    ? walletRoutes.home(currentWalletClientId)
    : '/home';

  if (publicRoutes.includes(pathname)) {
    return null;
  }

  return (
    <div className={s.container}>
      <Link href={pathname !== '/auth' && pathname !== '/' ? homeHref : '/'}>
        {getAppLogo()?.[themeType] ? (
          <Image
            src={getAppLogo()?.[themeType]}
            width={210}
            height={65}
            alt={'App logo'}
          />
        ) : themeType === 'light' ? (
          icons.logoWhite
        ) : (
          icons.logoDark
        )}
      </Link>
    </div>
  );
};

export default Header;
