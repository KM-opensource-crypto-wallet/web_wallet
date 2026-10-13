import {useCallback, useMemo, useState} from 'react';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {getSdkError} from '@walletconnect/utils';
import {getWalletConnect} from 'dok-wallet-blockchain-networks/service/walletconnect';
import {resetWalletConnect} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSlice';
import {
  removeAllWalletConnectSession,
  removeWalletConnectSession,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  selectWalletConnectData,
  selectWalletConnectSessions,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {clearWalletConnectStorageCache} from 'utils/localStorageData';

// Connected WalletConnect sessions (each with its chains) and disconnecting
// one. Shared by WalletConnectItem and the WalletConnect page.
const useWalletConnectSessions = ({onLastDisconnected} = {}) => {
  const sessions = useSelector(selectWalletConnectSessions, shallowEqual);
  const walletData = useSelector(selectWalletConnectData, shallowEqual);
  const dispatch = useDispatch();
  const [deletingSession, setDeletingSession] = useState([]);

  const allSessions = useMemo(
    () =>
      Object.keys(sessions).map(key => ({
        ...sessions[key],
        chainData: walletData[key],
      })),
    [sessions, walletData],
  );

  const disconnect = useCallback(
    async (sessionId, topic) => {
      try {
        setDeletingSession(prevState => [...prevState, sessionId]);
        const walletConnect = getWalletConnect();
        if (!walletConnect) {
          throw new Error('WalletConnect is not initialised yet');
        }
        await walletConnect.disconnectSession({
          topic,
          reason: getSdkError('USER_DISCONNECTED'),
        });

        if (allSessions.length === 1) {
          onLastDisconnected && onLastDisconnected();
          dispatch(resetWalletConnect());
          sessionId && dispatch(removeAllWalletConnectSession());
          clearWalletConnectStorageCache().then();
        } else {
          dispatch(removeWalletConnectSession(sessionId));
        }
        setDeletingSession(prevState =>
          prevState.filter(item => item !== sessionId),
        );
      } catch (e) {
        dispatch(resetWalletConnect());
        dispatch(removeAllWalletConnectSession());
        setDeletingSession(prevState =>
          prevState.filter(item => item !== sessionId),
        );
        console.error('Error in disconnect', e);
      }
    },
    [allSessions.length, dispatch, onLastDisconnected],
  );

  const isDisconnecting = useCallback(
    sessionId => deletingSession.includes(sessionId),
    [deletingSession],
  );

  return {sessions: allSessions, disconnect, isDisconnecting};
};

export default useWalletConnectSessions;
