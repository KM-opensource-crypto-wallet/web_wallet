'use client';
import React, {useMemo, useState} from 'react';
import s from './Sidebar.module.css';
import sidebarList from 'data/sidebarList';
import ActiveLink from 'components/ActiveLink';
import {usePathname} from 'next/navigation';
import ModalReset from 'components/ModalReset';
import WalletConnectRequestModal from '../WalletConnectRequestModal';
import {
  setWalletConnectRequestModal,
  setWalletConnectTransactionModal,
} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSlice';
import WalletConnectTransactionModal from '../WalletConnectTransactionModal';
import {useDispatch, useSelector} from 'react-redux';
import {
  selectRequestedModalVisible,
  selectTransactionModalVisible,
} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import NewsModal from '../NewsModal';
import {
  getNewsMessage,
  getNewsModalVisible,
} from 'dok-wallet-blockchain-networks/redux/currency/currencySelectors';
import {setNewsModalVisible} from 'dok-wallet-blockchain-networks/redux/currency/currencySlice';
import {slide as Menu} from 'react-burger-menu';
import {useTranslations} from 'next-intl';
import {publicRoutes, getActiveNavSegment} from 'utils/common';
import {
  getCryptoProviders,
  getExchangeProviders,
  getSellCryptoAllProviders,
} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProvidersSelectors';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

const Sidebar = () => {
  const t = useTranslations('home');

  const path = usePathname();
  const pathname = getActiveNavSegment(path);

  const [modal, setModal] = useState(false);
  const [page, setPage] = useState('');
  const requestedModalVisible = useSelector(selectRequestedModalVisible);
  const transactionModalVisible = useSelector(selectTransactionModalVisible);
  const isNewsModalVisible = useSelector(getNewsModalVisible);
  const newsMessage = useSelector(getNewsMessage);
  const buyCryptoProvider = useSelector(getCryptoProviders);
  const sellCryptoProvider = useSelector(getSellCryptoAllProviders);
  const exchangeCryptoProvider = useSelector(getExchangeProviders);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);

  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const dispatch = useDispatch();

  const filterSideBarList = useMemo(
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

  const handleToggleMenu = () => {
    setIsOpenMenu(!isOpenMenu);
  };

  const handleCheckMenu = () => {
    setIsOpenMenu(!isOpenMenu);
  };
  const shouldDisplayMenu = () =>
    pathname !== '/auth' &&
    pathname !== '/' &&
    !publicRoutes.includes(pathname);
  return (
    shouldDisplayMenu() && (
      <>
        <aside className={s.container}>
          <ul>
            {filterSideBarList.map(({key, href, item}) => (
              <li key={key}>
                <ActiveLink href={href} setModal={setModal} setPage={setPage}>
                  {item(t)}
                </ActiveLink>
              </li>
            ))}
          </ul>
        </aside>
        <Menu
          onOpen={handleToggleMenu}
          onClose={handleToggleMenu}
          isOpen={isOpenMenu}
          disableOverlayClick={handleToggleMenu}
          left
          width={280}
          burgerButtonClassName={s.bmBurgerButton}
          burgerBarClassName={s.bmBurgerBars}
          crossButtonClassName={s.bmCrossButton}
          crossClassName={s.bmCross}
          menuClassName={s.bmMenu}
          morphShapeClassName={s.bmMorphShape}
          itemListClassName={s.bmItemList}
          overlayClassName={s.bmOverlay}>
          <ul className={s.navList}>
            {filterSideBarList.map(({key, href, item}) => (
              <li key={key} onClick={handleCheckMenu}>
                <ActiveLink href={href} setModal={setModal} setPage={setPage}>
                  {item(t)}
                </ActiveLink>
              </li>
            ))}
          </ul>
        </Menu>
        <ModalReset
          visible={modal}
          hideModal={setModal}
          page={page}
          link={pathname}
        />
        <WalletConnectRequestModal
          visible={requestedModalVisible}
          onClose={() => {
            dispatch(setWalletConnectRequestModal(false));
          }}
        />
        <WalletConnectTransactionModal
          visible={transactionModalVisible}
          onClose={() => {
            dispatch(setWalletConnectTransactionModal(false));
          }}
        />
        <NewsModal
          visible={isNewsModalVisible}
          message={newsMessage}
          onClose={() => {
            dispatch(setNewsModalVisible(false));
          }}
        />
      </>
    )
  );
};

export default Sidebar;
