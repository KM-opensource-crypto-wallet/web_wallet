'use client';

import Link from 'next/link';
import s from './Header.module.css';

import {getAppLogo} from 'whitelabel/whiteLabelInfo';
const icons = require(`assets/images/icons`).default;
import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {ThemeContext} from 'theme/ThemeContext';
import {usePathname} from 'next/navigation';
import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {publicRoutes} from 'utils/common';
import {useSelector} from 'react-redux';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {walletRoutes} from 'utils/routes';
import ActiveLink from 'components/ActiveLink';
import ModalReset from 'components/ModalReset';
import useNavList from 'src/hooks/navigation/useNavList';
import {ChevronDownIcon, ProfileIcon} from 'components/Sidebar/SidebarIcons';

// Wallet entries that stay in the profile menu instead of the top nav.
const PROFILE_WALLET_KEYS = ['receivePaymentUrl'];

const Header = () => {
  const t = useTranslations('home');
  const {themeType} = useContext(ThemeContext);
  const path = usePathname();
  const pathname = `/${path.split('/')[1]}`;
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const {navList, showNav, pathname: navPathname} = useNavList();
  // Logo goes to the active wallet's Home; before a wallet exists the legacy
  // /home forwarder resolves it once one does.
  const homeHref = currentWalletClientId
    ? walletRoutes.home(currentWalletClientId)
    : '/home';

  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState('');
  const menuRef = useRef(null);

  // Desktop only (CSS hides both on phones, where the Sidebar drawer is used).
  const {primaryItems, menuGroups} = useMemo(() => {
    const isPrimary = item =>
      item.section === 'wallet' && !PROFILE_WALLET_KEYS.includes(item.key);
    const rest = navList.filter(item => !isPrimary(item));
    return {
      primaryItems: navList.filter(isPrimary),
      menuGroups: [
        rest.filter(item => item.section !== 'account'),
        rest.filter(item => item.section === 'account'),
      ].filter(items => items.length > 0),
    };
  }, [navList]);

  // Close the profile menu on outside click or Escape (item clicks close it
  // via their <li>).
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = event => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  if (publicRoutes.includes(pathname)) {
    return null;
  }

  return (
    <header className={s.container}>
      <Link
        className={s.logo}
        href={pathname !== '/auth' && pathname !== '/' ? homeHref : '/'}>
        {getAppLogo()?.[themeType] ? (
          <Image
            src={getAppLogo()?.[themeType]}
            width={210}
            height={65}
            alt={'App logo'}
            className={s.logoImage}
          />
        ) : themeType === 'light' ? (
          icons.logoWhite
        ) : (
          icons.logoDark
        )}
      </Link>

      {showNav && (
        <>
          <nav className={s.nav} aria-label='Main'>
            <ul className={s.navList}>
              {primaryItems.map(({key, href, Icon}) => (
                <li key={key} data-tour={`nav-${key}`}>
                  <ActiveLink
                    href={href}
                    setModal={setModal}
                    setPage={setPage}
                    className={s.navItem}
                    activeClassName={s.navItemActive}>
                    <span className={s.navIcon}>
                      <Icon size={18} />
                    </span>
                    <span className={s.navLabel}>{t(key)}</span>
                  </ActiveLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={s.profile} ref={menuRef} data-tour='nav-profile'>
            <button
              type='button'
              className={`${s.profileButton} ${
                menuOpen ? s.profileButtonOpen : ''
              }`}
              aria-label='Account menu'
              aria-controls='header-profile-menu'
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(open => !open)}>
              <span className={s.avatar}>
                <ProfileIcon size={18} />
              </span>
              <span className={s.chevron}>
                <ChevronDownIcon size={14} strokeWidth={2.2} />
              </span>
            </button>

            {menuOpen && (
              <div id='header-profile-menu' className={s.menu}>
                {menuGroups.map((items, index) => (
                  <ul key={index} className={s.menuGroup}>
                    {items.map(({key, href, Icon, section}) => (
                      <li key={key} onClick={() => setMenuOpen(false)}>
                        <ActiveLink
                          href={href}
                          setModal={setModal}
                          setPage={setPage}
                          className={`${s.menuItem} ${
                            section === 'account' ? s.menuItemDanger : ''
                          }`}
                          activeClassName={s.menuItemActive}>
                          <span className={s.menuIcon}>
                            <Icon size={18} />
                          </span>
                          <span className={s.menuLabel}>{t(key)}</span>
                        </ActiveLink>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            )}
          </div>

          <ModalReset
            visible={modal}
            hideModal={setModal}
            page={page}
            link={navPathname}
          />
        </>
      )}
    </header>
  );
};

export default Header;
