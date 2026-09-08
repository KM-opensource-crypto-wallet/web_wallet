import styles from './WalletConnectItem.module.css';
import React, {useCallback, useMemo, useState} from 'react';
import Image from 'next/image';
import {getWalletConnect} from 'dok-wallet-blockchain-networks/service/walletconnect';
import {getSdkError} from '@walletconnect/utils';
import {resetWalletConnect} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSlice';
import {
  removeAllWalletConnectSession,
  removeWalletConnectSession,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {
  selectWalletConnectData,
  selectWalletConnectSessions,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {clearWalletConnectStorageCache} from 'utils/localStorageData';
import WalletConnectChainRow from 'components/WalletConnectChainRow';

/////////////////////////////////////////

const WalletConnectItem = ({onClose}) => {
  const sessions = useSelector(selectWalletConnectSessions, shallowEqual);
  const walletData = useSelector(selectWalletConnectData, shallowEqual);
  const dispatch = useDispatch();
  const [deletingSession, setDeletingSession] = useState([]);

  const allSessions = useMemo(() => {
    const sessionKeys = Object.keys(sessions);
    let finalData = [];
    sessionKeys.forEach(item => {
      let tempSession = sessions[item];
      tempSession = {...tempSession, chainData: walletData[item]};
      finalData.push(tempSession);
    });
    return finalData;
  }, [sessions, walletData]);

  const onPressDisconnect = useCallback(
    async (sessionId, topic) => {
      try {
        setDeletingSession(prevState => [...prevState, sessionId]);
        const walletConnect = getWalletConnect();
        await walletConnect.disconnectSession({
          topic,
          reason: getSdkError('USER_DISCONNECTED'),
        });

        if (allSessions.length === 1) {
          onClose && onClose();
          dispatch(resetWalletConnect());
          sessionId && dispatch(removeAllWalletConnectSession());
          clearWalletConnectStorageCache().then();
        } else {
          dispatch(removeWalletConnectSession(sessionId));
        }
        setDeletingSession(prevState =>
          prevState.filter(item => item !== sessionId),
        );
        // }
      } catch (e) {
        dispatch(resetWalletConnect());
        dispatch(removeAllWalletConnectSession());
        setDeletingSession(prevState =>
          prevState.filter(item => item !== sessionId),
        );
        console.error('Error in disconnect', e);
      }
    },
    [allSessions.length, dispatch, onClose],
  );

  return allSessions.map((item, index) => {
    const metadata = item?.peer?.metadata;
    const icon = metadata?.icons[0] || '';
    const chainData = Array.isArray(item?.chainData) ? item?.chainData : [];
    const isDeleting = deletingSession.includes(item.pairingTopic);
    return (
      <div className={styles.itemView} key={'' + item.key + index}>
        <div className={styles.rowView}>
          <Image
            src={icon}
            className={styles.rowImageStyle}
            alt={'icon'}
            width={60}
            height={60}
            priority
          />

          <div className={styles.centerItemView}>
            <p className={styles.title}>{`${metadata?.name}`}</p>
            <p className={styles.url}>{metadata?.url}</p>
          </div>
        </div>
        <p className={styles.title}>{'Chains'}</p>
        {chainData?.map((chain, i) => (
          <div className={styles.chainRowView} key={'' + chain?._id + i}>
            <WalletConnectChainRow
              icon={chain?.icon}
              chain_name={chain?.chain_name}
              title={chain?.chain_display_name}
              subtitle={chain?.address}
            />
          </div>
        ))}
        <button
          disabled={isDeleting}
          className={styles.buttonStyle}
          style={{
            backgroundColor: isDeleting ? '#708090' : 'red',
          }}
          onClick={() => {
            onPressDisconnect(item.pairingTopic, item.topic).then();
          }}>
          {'Disconnect App'}
        </button>
        <div className={styles.borderView} />
      </div>
    );
  });
};

export default WalletConnectItem;
