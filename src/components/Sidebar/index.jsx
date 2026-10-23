'use client';
import React, {useMemo, useState} from 'react';
import s from './Sidebar.module.css';
import ActiveLink from 'components/ActiveLink';
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
  selectWalletConnectTransactionData,
} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import NewsModal from '../NewsModal';
import {
  getNewsMessage,
  getNewsModalVisible,
} from 'dok-wallet-blockchain-networks/redux/currency/currencySelectors';
import {setNewsModalVisible} from 'dok-wallet-blockchain-networks/redux/currency/currencySlice';
import {slide as Menu} from 'react-burger-menu';
import {useTranslations} from 'next-intl';
import useNavList from 'src/hooks/navigation/useNavList';

// Order of the dividers-separated groups in the nav.
const SECTIONS = ['wallet', 'general', 'account'];

const Sidebar = () => {
  const t = useTranslations('home');

  const {navList, showNav, pathname} = useNavList();

  const [modal, setModal] = useState(false);
  const [page, setPage] = useState('');
  const requestedModalVisible = useSelector(selectRequestedModalVisible);
  const transactionModalVisible = useSelector(selectTransactionModalVisible);
  // The transaction modal snapshots the request it was mounted for; keying by
  // request id remounts it (and resets its acknowledgement) per request.
  const transactionRequestId = useSelector(
    state => selectWalletConnectTransactionData(state)?.id,
  );
  const isNewsModalVisible = useSelector(getNewsModalVisible);
  const newsMessage = useSelector(getNewsMessage);
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const dispatch = useDispatch();

  const handleToggleMenu = () => {
    setIsOpenMenu(!isOpenMenu);
  };

  const handleCheckMenu = () => {
    setIsOpenMenu(!isOpenMenu);
  };
  const sections = useMemo(
    () =>
      SECTIONS.map(section =>
        navList.filter(item => item.section === section),
      ).filter(items => items.length > 0),
    [navList],
  );

  const renderNav = onItemClick => (
    <nav className={s.nav}>
      {sections.map((items, index) => (
        <ul key={index} className={s.group}>
          {items.map(({key, href, Icon, section}) => (
            <li key={key} onClick={onItemClick}>
              <ActiveLink
                href={href}
                setModal={setModal}
                setPage={setPage}
                className={`${s.item} ${section === 'account' ? s.itemAccount : ''}`}
                activeClassName={s.itemActive}>
                <span className={s.itemIcon}>
                  <Icon />
                </span>
                <span className={s.itemLabel}>{t(key)}</span>
              </ActiveLink>
            </li>
          ))}
        </ul>
      ))}
    </nav>
  );

  // Desktop navigation lives in the Header; this drawer is phones only. The
  // app-wide modals below still mount here on every screen size.
  return (
    showNav && (
      <>
        <Menu
          onOpen={handleToggleMenu}
          onClose={handleToggleMenu}
          isOpen={isOpenMenu}
          disableOverlayClick={handleToggleMenu}
          left
          width={288}
          burgerButtonClassName={s.bmBurgerButton}
          burgerBarClassName={s.bmBurgerBars}
          crossButtonClassName={s.bmCrossButton}
          crossClassName={s.bmCross}
          menuClassName={s.bmMenu}
          morphShapeClassName={s.bmMorphShape}
          itemListClassName={s.bmItemList}
          overlayClassName={s.bmOverlay}>
          {renderNav(handleCheckMenu)}
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
          key={transactionRequestId ?? 'idle'}
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
