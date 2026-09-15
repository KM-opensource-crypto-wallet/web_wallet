import React, {useCallback, useEffect, useMemo, useState} from 'react';
import styles from './WalletConnectRequestModal.module.css';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {getSdkError} from '@walletconnect/utils';
import {useDispatch, useSelector} from 'react-redux';
import {getWalletConnect} from 'dok-wallet-blockchain-networks/service/walletconnect';
import {setWalletConnectConnection} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSlice';
import {selectWalletConnectRequestData} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import {
  setWalletConnectWalletData,
  setWalletConnect,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  selectAllCoins,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  getCustomizePublicAddress,
  isHederaUnactivated,
} from 'dok-wallet-blockchain-networks/helper';
import {
  BTC_VARIANT_CHAIN_NAMES,
  buildSessionNamespaces,
  collectProposalChains,
  getSessionAccountAddress,
  getUnsupportedRequiredChains,
  resolveSessionChainData,
  toSessionAccountsData,
} from 'dok-wallet-blockchain-networks/helper/walletConnectSession';
import {showToast} from 'utils/toast';
import WalletConnectModalHeader from 'components/WalletConnectModalHeader';
import WalletConnectChainRow from 'components/WalletConnectChainRow';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '95%',
  bgcolor: 'var(--secondaryBackgroundColor)',
  borderRadius: '10px',
  overflow: 'hidden',
  '@media (min-width: 768px)': {
    width: '50%',
  },
};

const getTonSessionProperties = privateKey => {
  const {
    TonChain,
  } = require('dok-wallet-blockchain-networks/cryptoChain/chains/TonChain');
  return TonChain().getSessionProperties({privateKey});
};
const HEDERA_UNACTIVATED_SESSION_MESSAGE =
  'Hedera native requests need a funded account (deposit HBAR to your address first). EVM requests on Hedera still work.';
const BTC_VARIANT_LABELS = {
  bitcoin: 'Native SegWit',
  bitcoin_segwit: 'SegWit',
  bitcoin_legacy: 'Legacy',
  bitcoin_taproot: 'Taproot',
};

// Middle-ellipsis for the per-type address preview: keeps the prefix that
// identifies the address type (bc1q / bc1p / 3 / 1) and the checksum tail.
const shortenAddress = (address, head = 8, tail = 6) => {
  if (typeof address !== 'string') {
    return '';
  }
  return address.length <= head + tail + 1
    ? address
    : `${address.slice(0, head)}…${address.slice(-tail)}`;
};

const WalletConnectRequestModal = props => {
  const requestData = useSelector(selectWalletConnectRequestData);
  const allCoins = useSelector(selectAllCoins);
  const currentWallet = useSelector(selectCurrentWallet);
  const [chainData, setChainData] = useState([]);
  const [unsupportedRequiredChains, setUnsupportedRequiredChains] = useState(
    [],
  );
  const [bitcoinAddressType, setBitcoinAddressType] = useState('bitcoin');
  const dispatch = useDispatch();
  const image = requestData?.icons?.[0] || null;
  const title = requestData?.name || '';
  const url = requestData?.url || '';
  const id = requestData?.id || '';
  const sessionId = requestData?.sessionId || '';
  const relays = requestData?.relays || {};

  // One entry per proposed CAIP-2 chain id we can serve. A coin may answer for
  // several ids (Hedera: `hedera:<net>` and `eip155:<chain_id>`).
  useEffect(() => {
    if (requestData?.requiredNamespaces && allCoins.length) {
      const {requiredChains, optionalChains} =
        collectProposalChains(requestData);
      setChainData(
        resolveSessionChainData({
          requiredChains,
          optionalChains,
          allCoins,
          bitcoinAddressType,
        }),
      );
      setUnsupportedRequiredChains(
        getUnsupportedRequiredChains(requiredChains),
      );
    }
  }, [requestData, allCoins, bitcoinAddressType]);

  // What the session will actually carry: the namespace's account form
  // (Hedera `0.0.N` on `hedera:*`, the address elsewhere), minus native Hedera
  // entries whose ledger account does not exist yet.
  const sessionChainData = useMemo(
    () => toSessionAccountsData(chainData),
    [chainData],
  );
  const {namespaces, missingRequired} = useMemo(
    () =>
      buildSessionNamespaces({
        requiredNamespaces: requestData?.requiredNamespaces,
        optionalNamespaces: requestData?.optionalNamespaces,
        sessionChainData,
      }),
    [requestData, sessionChainData],
  );
  const unactivatedHederaKey = chainData.find(
    item => item.namespace === 'hedera' && isHederaUnactivated(item),
  )?.key;
  const canApprove =
    unsupportedRequiredChains.length === 0 &&
    missingRequired.length === 0 &&
    Object.keys(namespaces).length > 0;
  let errorText = '';
  if (unsupportedRequiredChains.length) {
    errorText = `The dApp requires ${unsupportedRequiredChains.join(
      ', ',
    )}, which this wallet does not support.`;
  } else if (missingRequired.length) {
    errorText = `The dApp requires ${missingRequired.join(
      ', ',
    )}, but this wallet has no account for it yet.`;
  }

  useEffect(() => {
    if (unactivatedHederaKey) {
      showToast({
        type: 'warningToast',
        title: 'Hedera account not active',
        message: HEDERA_UNACTIVATED_SESSION_MESSAGE,
      });
    }
  }, [unactivatedHederaKey]);

  const btcVariantCoins = allCoins.filter(
    item =>
      item.symbol === 'BTC' &&
      BTC_VARIANT_CHAIN_NAMES.includes(item.chain_name),
  );
  const hasBitcoinRequest = chainData.some(item =>
    BTC_VARIANT_CHAIN_NAMES.includes(item.chain_name),
  );

  const onPressApprove = async () => {
    try {
      props?.onClose?.();
      const connector = getWalletConnect();
      if (!connector) {
        return;
      }
      if (!canApprove) {
        await connector.rejectSession({
          id,
          reason: getSdkError(
            missingRequired.length
              ? 'UNSUPPORTED_ACCOUNTS'
              : 'UNSUPPORTED_CHAINS',
          ),
        });
        return;
      }
      const hasTon = Boolean(namespaces.ton);
      let tonSessionProperties = {};
      if (hasTon) {
        const tonCoinData = sessionChainData.find(
          item => item.chain_name === 'ton',
        );
        if (tonCoinData?.privateKey) {
          tonSessionProperties = getTonSessionProperties(
            tonCoinData.privateKey,
          );
        }
      }
      const session = await connector.approveSession({
        id,
        namespaces,
        relayProtocol: relays[0].protocol,
        ...(hasTon && {sessionProperties: tonSessionProperties}),
      });

      dispatch(
        setWalletConnect({
          [sessionId]: session,
        }),
      );
      dispatch(setWalletConnectConnection(true));

      // The per-session walletData is what the transaction modal and the
      // signer check read back, keyed by CAIP-2 id.
      sessionId &&
        dispatch(setWalletConnectWalletData({[sessionId]: sessionChainData}));
    } catch (e) {
      console.error('Error in approve request', e);
    }
  };

  const onPressReject = useCallback(() => {
    props?.onClose?.();
    const connector = getWalletConnect();
    if (connector) {
      connector.rejectSession({
        id,
        reason: getSdkError('USER_REJECTED_CHAINS'),
      });
    }
  }, [id, props]);

  return (
    <Modal
      open={props.visible}
      onClose={() => props.onClose(false)}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'>
      <Box sx={style}>
        <div className={styles.container}>
          <WalletConnectModalHeader image={image} title={title} url={url} />
          <p className={styles.chainTitle}>{'Chains'}</p>
          {chainData.map((item, index) => (
            <div className={styles.itemView} key={item.key + index}>
              <WalletConnectChainRow
                icon={item?.icon}
                chain_name={item?.chain_name}
                title={`${item?.chain_display_name} (${currentWallet.walletName})`}
                subtitle={
                  getCustomizePublicAddress(getSessionAccountAddress(item)) ||
                  'Account not active yet'
                }
              />
            </div>
          ))}
          {hasBitcoinRequest && btcVariantCoins.length > 1 && (
            <div className={styles.addressTypeView}>
              <p className={styles.chainTitle} style={{marginLeft: 0}}>
                {'Bitcoin address type'}
              </p>
              <div className={styles.addressTypeGrid} role='radiogroup'>
                {btcVariantCoins.map(coin => {
                  const selected = bitcoinAddressType === coin.chain_name;
                  return (
                    <button
                      type='button'
                      key={coin.chain_name}
                      role='radio'
                      aria-checked={selected}
                      className={`${styles.addressTypeCard} ${
                        selected ? styles.addressTypeCardSelected : ''
                      }`}
                      onClick={() => setBitcoinAddressType(coin.chain_name)}>
                      <span className={styles.addressTypeCardHeader}>
                        <span className={styles.addressTypeLabel}>
                          {BTC_VARIANT_LABELS[coin.chain_name] ||
                            coin.chain_name}
                        </span>
                        {/* Fixed slot so the label does not shift when the
                            check appears. */}
                        <span className={styles.addressTypeCheckSlot}>
                          {selected && (
                            <CheckCircleIcon
                              sx={{fontSize: 18, color: 'var(--background)'}}
                            />
                          )}
                        </span>
                      </span>
                      <span className={styles.addressTypeAddress}>
                        {shortenAddress(coin.address)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className={styles.bottomView}>
            {!!errorText && <p className={styles.errorText}>{errorText}</p>}
            <div className={styles.rowView}>
              <button className={styles.button} onClick={onPressReject}>
                {'Reject'}
              </button>
              <button
                disabled={!canApprove}
                style={{
                  backgroundColor: !canApprove
                    ? 'var(--gray)'
                    : 'var(--background)',
                }}
                className={styles.button}
                onClick={onPressApprove}>
                {'Accept'}
              </button>
            </div>
          </div>
        </div>
      </Box>
    </Modal>
  );
};
export default WalletConnectRequestModal;
