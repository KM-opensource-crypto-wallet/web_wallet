'use client';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import s from './Sidebar.module.css';
import sidebarList from 'data/sidebarList';
import ActiveLink from 'components/ActiveLink';
import {usePathname, useRouter} from 'next/navigation';
import ModalReset from 'components/ModalReset';
import WalletConnectRequestModal from '../WalletConnectRequestModal';
import {
  setWalletConnectRequestModal,
  setWalletConnectTransactionModal,
} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSlice';
import WalletConnectTransactionModal from '../WalletConnectTransactionModal';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
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
import {
  addConversation,
  addMessagesToConversation,
  getConversation,
  setSelectedConversation,
} from 'dok-wallet-blockchain-networks/redux/messages/messageSlice';
import {XMTP} from 'src/utils/xmtp';
import {getEthereumCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  getConversations,
  getSelectedConversations,
} from 'dok-wallet-blockchain-networks/redux/messages/messageSelector';
import {showToast} from 'src/utils/toast';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';
import {isChatOptions} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {useTranslations} from 'next-intl';
import {publicRoutes} from 'utils/common';
import {
  getCryptoProviders,
  getExchangeProviders,
  getSellCryptoAllProviders,
} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProvidersSelectors';

const Sidebar = () => {
  const router = useRouter();
  const selectedTopicRef = useRef();
  const conversationsRef = useRef([]);
  const unsubscribeMessage = useRef();
  const unsubscribeConversation = useRef();
  const previousAddress = useRef(null);
  const messageProccessed = useRef({});

  const t = useTranslations('home');

  const path = usePathname();
  const pathname = `/${path.split('/')[1]}`;

  const selectedConversation = useSelector(
    getSelectedConversations,
    shallowEqual,
  );
  const conversations = useSelector(getConversations, shallowEqual);
  const ethereumCoin = useSelector(getEthereumCoin, shallowEqual);

  const [modal, setModal] = useState(false);
  const [page, setPage] = useState('');
  const requestedModalVisible = useSelector(selectRequestedModalVisible);
  const transactionModalVisible = useSelector(selectTransactionModalVisible);
  const isNewsModalVisible = useSelector(getNewsModalVisible);
  const newsMessage = useSelector(getNewsMessage);
  const isChatOptionsEnabled = useSelector(isChatOptions);
  const buyCryptoProvider = useSelector(getCryptoProviders);
  const sellCryptoProvider = useSelector(getSellCryptoAllProviders);
  const exchangeCryptoProvider = useSelector(getExchangeProviders);

  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const dispatch = useDispatch();

  const filterSideBarList = useMemo(
    () =>
      sidebarList.filter(item => {
        if (item.href === '/buy-crypto') return buyCryptoProvider.length > 0;
        if (item.href === '/sell-crypto') return sellCryptoProvider.length > 0;
        if (item.href === '/swap') return exchangeCryptoProvider.length > 0;
        return true;
      }),
    [
      buyCryptoProvider.length,
      exchangeCryptoProvider.length,
      sellCryptoProvider.length,
    ],
  );

  useEffect(() => {
    selectedTopicRef.current = selectedConversation?.topic;
  }, [selectedConversation?.topic]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (
      ethereumCoin?.address &&
      previousAddress.current &&
      ethereumCoin?.address !== previousAddress?.current &&
      isChatOptionsEnabled
    ) {
      unsubscribeMessage.current?.return().catch(console.error);
      unsubscribeConversation.current?.return().catch(console.error);
    }
    if (isChatOptionsEnabled && ethereumCoin?.address) {
      previousAddress.current = ethereumCoin?.address;
      dispatch(getConversation())
        .unwrap()
        .then(async () => {
          const client = XMTP.getClient();
          const onMessageReceived = message => {
            if (messageProccessed.current[message?.id]) {
              return;
            }
            messageProccessed.current[message?.id] = true;
            const topic = message.contentTopic;
            const address = message.conversation.client.address;
            const formattedMessages = XMTP.formatMessage([message]);
            dispatch(
              addMessagesToConversation({
                topic,
                messages: formattedMessages,
                address,
              }),
            );
            if (
              address !== message.senderAddress &&
              !!conversationsRef.current?.find(
                item =>
                  item?.topic === topic && item?.consentState !== 'denied',
              ) &&
              (window.location.pathname !== '/chats/chat' ||
                (window.location.pathname === '/chats/chat' &&
                  selectedTopicRef.current !== topic))
            ) {
              showToast({
                type: 'messageToast',
                title: getCustomizePublicAddress(message.senderAddress),
                message: message.content,
                onClick: () => {
                  dispatch(
                    setSelectedConversation({
                      address: address,
                      topic: topic,
                    }),
                  );
                  router.push('/chats/chat');
                },
              });
            }
          };
          const onNewConversation = conversation => {
            const topic = conversation.topic;
            const address = conversation.client.address;
            const formattedConversation = XMTP.formatConversation([
              conversation,
            ]);

            dispatch(
              addConversation({
                topic,
                conversationData: formattedConversation[0],
                address,
              }),
            );
          };

          unsubscribeMessage.current =
            await client.conversations.streamAllMessages();
          for await (const message of unsubscribeMessage.current) {
            onMessageReceived(message);
          }

          unsubscribeConversation.current = await client.conversations.stream();
          for await (const conversation of unsubscribeConversation.current) {
            onNewConversation(conversation);
          }
        });
    }
    return () => {
      unsubscribeMessage.current?.return().catch(console.error);
      unsubscribeConversation.current?.return().catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatOptionsEnabled, ethereumCoin?.address]);

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
            {filterSideBarList.map(({href, item}) => (
              <li key={href}>
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
            {filterSideBarList.map(({href, item}) => (
              <li key={href} onClick={handleCheckMenu}>
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
