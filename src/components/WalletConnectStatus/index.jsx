import React, {useEffect, useMemo, useState} from 'react';
import styles from './WalletConnectStatus.module.css';
import WalletConnectList from 'components/WalletConnectList';
import {shallowEqual, useSelector} from 'react-redux';
import {
  selectAllWalletConnectSessions,
  selectWalletConnectSessions,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getIsWalletConnectInitialized} from 'dok-wallet-blockchain-networks/redux/extraData/extraSelectors';
import {subscribeWalletConnect} from 'dok-wallet-blockchain-networks/service/walletconnect';
import {captureError} from 'services/logger';

const WalletConnectStatus = () => {
  const sessions = useSelector(selectWalletConnectSessions, shallowEqual);
  const allSessions = useSelector(selectAllWalletConnectSessions, shallowEqual);
  const isInitialized = useSelector(getIsWalletConnectInitialized);
  const allSessionKeys = useMemo(() => {
    return Object.keys(sessions);
  }, [sessions]);
  const [modalOpen, setModalClose] = useState(false);

  // AppRouting flips the flag once WalletKit.init resolves; before that the
  // client does not exist yet. The service latches itself after the first
  // successful call, so re-running on remount is a no-op.
  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    subscribeWalletConnect(allSessions).catch(e =>
      captureError(e, {tags: {area: 'walletconnect', op: 'subscribe'}}),
    );
    // allSessions is only the snapshot handed to the one-time subscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  return allSessionKeys.length ? (
    <>
      <button
        className={styles.mainView}
        onClick={() => {
          setModalClose(true);
        }}>
        {`${allSessionKeys.length} App${
          allSessionKeys.length > 1 ? 's' : ''
        } connected`}
      </button>
      <WalletConnectList visible={modalOpen} onClose={setModalClose} />
    </>
  ) : null;
};

export default WalletConnectStatus;
