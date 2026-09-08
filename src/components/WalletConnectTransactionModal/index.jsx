import React, {useCallback, useMemo} from 'react';
import styles from './WalletConnectTransactionModal.module.css';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {currencySymbol} from 'data/currency';
import {
  convertHexToUtf8IfPossible,
  decodeSolMessage,
  getCustomizePublicAddress,
  isValidBigInt,
  parseBalance,
  safelyJsonParse,
  safelyJsonStringify,
} from 'dok-wallet-blockchain-networks/helper';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {getWalletConnect} from 'dok-wallet-blockchain-networks/service/walletconnect';
import {selectWalletConnectTransactionData} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import {selectWalletConnectData} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {walletConnect} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  EVM_SIGN_REQUEST_HANDLERS,
  isNonEVMChain,
  NON_EVM_METHOD_HANDLERS,
} from 'dok-wallet-blockchain-networks/config/config';
import {getSolanaFeePayer} from 'dok-wallet-blockchain-networks/helper/solanaTransaction';
import {describeHederaRequest} from 'dok-wallet-blockchain-networks/helper/hederaWalletConnect';
import BigNumber from 'bignumber.js';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {copyToClipboard} from 'utils/copyToClipboard';
import WalletConnectModalHeader from 'components/WalletConnectModalHeader';
import {
  BatchCallDataView,
  MessageNode,
  stringifyPrimitive,
} from 'components/WalletConnectMessageTree';

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

export const ETH_SEND_TRANSACTION = 'eth_sendTransaction';
export const ETH_SIGN_TRANSACTION = 'eth_signTransaction';
const transactionType = [ETH_SEND_TRANSACTION, ETH_SIGN_TRANSACTION];
const isWalletConnectTransaction = method => transactionType.includes(method);
function parseSolanaSignTransaction(txData) {
  // Default values for summary properties
  let sender = 'N/A';
  let data = 'N/A';

  try {
    if (!txData || typeof txData !== 'object') {
      throw new Error('Invalid transaction data provided');
    }
    // Modern Solana requests carry no feePayer/pubkey (signAllTransactions
    // sends only `transactions`), so read the fee payer from the tx itself.
    const firstTx = txData.transaction ?? txData.transactions?.[0];
    sender =
      txData.feePayer || txData.pubkey || getSolanaFeePayer(firstTx) || sender;
    data = txData?.transaction
      ? txData?.transaction
      : Array.isArray(txData?.transactions)
        ? `${txData.transactions.length} transaction(s): ${JSON.stringify(
            txData.transactions,
          )}`
        : data;
  } catch (error) {
    console.error('Error parsing transaction:', error);
  }
  return {
    sender,
    data,
  };
}
const getMessageData = (method, message) => {
  switch (method) {
    case 'personal_sign':
    case 'eth_sign':
      return {type: 'text', value: convertHexToUtf8IfPossible(message)};
    case 'solana_signMessage':
      return {type: 'text', value: decodeSolMessage(message)};
    case 'solana_signTransaction':
    case 'solana_signAndSendTransaction':
    case 'solana_signAllTransactions':
      return {type: 'json', value: parseSolanaSignTransaction(message)};
    case 'xrpl_signMessage':
      return {type: 'text', value: convertHexToUtf8IfPossible(message)};
    case 'polkadot_signMessage':
      return {
        type: 'text',
        value: convertHexToUtf8IfPossible(message?.message ?? message),
      };
    case 'stellar_signMessage':
      return {type: 'text', value: message};
    case 'hedera_signMessage':
      return {type: 'text', value: message?.message ?? ''};
    case 'hedera_signTransaction':
    case 'hedera_signAndExecuteTransaction':
    case 'hedera_executeTransaction':
    case 'hedera_signAndExecuteQuery':
      // Base64 protobuf is opaque; show the decoded transaction instead.
      return {type: 'json', value: describeHederaRequest(method, message)};
    default:
      return {
        type: 'json',
        value: typeof message === 'string' ? safelyJsonParse(message) : message,
      };
  }
};

const COPIED_TITLE = 'Copied to clipboard';
// Upper bound on wallet_sendCalls entries we render and allow approving.
const MAX_BATCH_CALLS = 50;

const DetailRow = ({label, value}) => (
  <div className={styles.transferItemView}>
    <p className={styles.transferTitle}>{label}</p>
    <p className={styles.boxBalance}>{value}</p>
  </div>
);

const WalletConnectTransactionModal = props => {
  const transactionData = useSelector(selectWalletConnectTransactionData);
  const dispatch = useDispatch();
  const image = transactionData?.peerMeta?.icons?.[0] || null;
  const title = transactionData?.peerMeta?.name || '';
  const url = transactionData?.peerMeta?.url || '';
  const id = transactionData?.id || '';
  const sessionId = transactionData?.sessionId || '';
  const method = transactionData?.method;
  const topic = transactionData?.topic;
  const chainId = transactionData?.chainId;
  const localCurrency = useSelector(getLocalCurrency);

  const walletConnectData = useSelector(selectWalletConnectData, shallowEqual);

  const walletData = useMemo(() => {
    const chains = walletConnectData[sessionId];
    const finalChains = Array.isArray(chains) ? chains : [];
    return finalChains.find(item => item.key === chainId);
  }, [chainId, sessionId, walletConnectData]);

  const getTransactionRequestData = useMemo(() => {
    if (isNonEVMChain(transactionData?.chainId)) {
      // Unmapped methods fall through with raw params so the request renders
      // and the thunk rejects it as unsupported instead of crashing here.
      const handler =
        NON_EVM_METHOD_HANDLERS[transactionData?.method] ||
        (params => ({finaltransactionData: params, signTypeData: params}));
      const {finaltransactionData, signTypeData, expectedSignerAddress} =
        handler(transactionData?.params);
      return {finaltransactionData, signTypeData, expectedSignerAddress};
    } else {
      if (transactionData?.method?.includes('wallet_sendCalls')) {
        const rawCalls = Array.isArray(transactionData?.params?.[0]?.calls)
          ? transactionData.params[0].calls
          : [];
        // Only the first MAX_BATCH_CALLS are mapped and rendered; approval is
        // blocked above the cap so the user never signs calls they can't see.
        const batchCalls = rawCalls.slice(0, MAX_BATCH_CALLS).map(call => ({
          ...call,
          etherValue: call?.value ? parseBalance(call.value, 18) : '',
        }));
        return {
          finaltransactionData: {
            batchCalls,
            batchCallsTotal: rawCalls.length,
            from: transactionData?.from,
          },
          expectedSignerAddress: transactionData?.params?.[0]?.from,
        };
      }
      const finaltransactionData = transactionData?.params?.[0] || {};
      const {signTypeData, expectedSignerAddress} = EVM_SIGN_REQUEST_HANDLERS[
        transactionData?.method
      ]?.(transactionData?.params) || {
        signTypeData: transactionData?.params?.[1],
        expectedSignerAddress: undefined,
      };
      if (finaltransactionData?.value) {
        const etherAmount = finaltransactionData?.value
          ? parseBalance(finaltransactionData?.value, 18)
          : '';
        const gasPrice =
          isValidBigInt(finaltransactionData?.gasPrice) || BigInt(0);
        const gasLimit =
          isValidBigInt(finaltransactionData?.gasLimit) || BigInt(0);

        const transactionFees = parseBalance(gasPrice * gasLimit, 18);
        const transactionFeeBN = BigNumber(transactionFees);
        const currencyRateBN = BigNumber(walletData?.currencyRate || '0');
        const fiatTransactionFees = transactionFeeBN
          .multipliedBy(currencyRateBN)
          .toString();
        const toAddress = finaltransactionData?.to;
        return {
          finaltransactionData,
          etherAmount,
          signTypeData,
          expectedSignerAddress,
          transactionFees,
          fiatTransactionFees,
          toAddress,
        };
      }
      return {
        finaltransactionData,
        signTypeData,
        expectedSignerAddress,
      };
    }
  }, [transactionData, walletData]);

  const onPressApprove = async () => {
    try {
      props?.onClose?.();
      dispatch(
        walletConnect({
          transactionData: {
            ...getTransactionRequestData?.finaltransactionData,
            batchCalls: transactionData?.params?.[0]?.calls,
            from: transactionData?.from,
          },
          isBatchTransaction: transactionData?.isBatchTransaction,
          chain_name: walletData?.chain_name?.toLowerCase(),
          // CAIP-2 id of the request; picks the executor for chains that
          // serve more than one namespace (Hedera native vs eip155).
          chainId,
          privateKey: walletData?.privateKey,
          walletAddress: walletData?.address,
          expectedSignerAddress:
            getTransactionRequestData?.expectedSignerAddress,
          id,
          topic,
          method,
          signTypeData: getTransactionRequestData?.signTypeData,
          domain: transactionData?.peerMeta?.url,
        }),
      );
    } catch (e) {
      console.error('Error in approve request', e);
    }
  };

  const onPressReject = useCallback(() => {
    props?.onClose?.();
    const connector = getWalletConnect();
    if (connector) {
      const response = {
        id,
        jsonrpc: '2.0',
        error: {
          code: 5000,
          message: 'User rejected.',
        },
      };
      connector.respondSessionRequest({topic, response});
    }
  }, [id, props, topic]);

  const batchCallsTotal =
    getTransactionRequestData?.finaltransactionData?.batchCallsTotal || 0;
  const isBatchTooLarge = batchCallsTotal > MAX_BATCH_CALLS;

  const BatchCallsView = () => {
    const calls =
      getTransactionRequestData?.finaltransactionData?.batchCalls || [];
    return (
      <div className={styles.contentContainerStyle}>
        <p
          className={styles.chainTitle}>{`Batch Calls (${batchCallsTotal})`}</p>
        {isBatchTooLarge && (
          <div className={styles.batchLimitWarning}>
            <WarningAmberIcon sx={{fontSize: 16, color: 'var(--warning)'}} />
            <p className={styles.batchLimitWarningText}>
              {`This request contains ${batchCallsTotal} calls. Only the first ${MAX_BATCH_CALLS} are shown and the batch cannot be approved here.`}
            </p>
          </div>
        )}
        <div className={styles.scrollView}>
          {calls.map((call, index) => (
            <div key={index} className={styles.batchCallBox}>
              <DetailRow label={'Call'} value={`#${index + 1}`} />
              <DetailRow
                label={'To'}
                value={getCustomizePublicAddress(call?.to)}
              />
              {!!call?.etherValue && (
                <DetailRow
                  label={'Value'}
                  value={`${call.etherValue} ${walletData?.symbol || ''}`}
                />
              )}
              <BatchCallDataView
                call={call}
                rowClassName={styles.transferItemView}
                labelClassName={styles.transferTitle}
                valueClassName={styles.boxBalance}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const MessageView = () => {
    const signTypeData = getTransactionRequestData?.signTypeData;
    const messageData = getMessageData(method, signTypeData);
    const isStructured =
      messageData.type === 'json' &&
      messageData.value !== null &&
      typeof messageData.value === 'object';

    const onCopyAll = () => {
      const text = isStructured
        ? safelyJsonStringify(messageData.value)
        : stringifyPrimitive(messageData.value);
      copyToClipboard(text || '', COPIED_TITLE);
    };

    return (
      <div className={styles.contentContainerStyle}>
        <div className={styles.msgHeaderRow}>
          <p className={styles.chainTitle} style={{marginTop: 0}}>
            {'Message'}
          </p>
          <button
            type='button'
            className={styles.msgCopyAllBtn}
            onClick={onCopyAll}>
            <ContentCopyIcon sx={{fontSize: 14, color: 'var(--gray)'}} />
            <span className={styles.msgCopyAllText}>{'Copy'}</span>
          </button>
        </div>
        <div className={styles.scrollView}>
          {isStructured ? (
            <MessageNode value={messageData.value} depth={0} />
          ) : (
            <p className={styles.messageStyle}>
              {messageData.type === 'text'
                ? messageData.value
                : stringifyPrimitive(messageData.value)}
            </p>
          )}
        </div>
      </div>
    );
  };

  const currencyRate = walletData?.currencyRate || '0';
  const amount = getTransactionRequestData?.etherAmount || '0';
  const currentRateBN = new BigNumber(currencyRate);
  const amountBN = new BigNumber(amount);
  const priceValue = currentRateBN.multipliedBy(amountBN);
  const fiatEstimateFee = getTransactionRequestData?.fiatTransactionFees || '0';
  const fiatEstimateFeeBN = new BigNumber(fiatEstimateFee);
  const totalValue = priceValue.plus(fiatEstimateFeeBN).toFixed(2);
  const transactionFee = getTransactionRequestData?.transactionFees;
  const transactionFeeNumber = Number(
    getTransactionRequestData?.transactionFees,
  );
  const finalTransactionFee =
    isNaN(transactionFeeNumber) || BigNumber(transactionFeeNumber).lte(0)
      ? 0
      : transactionFee;

  return (
    <Modal
      open={props.visible}
      onClose={() => props.onClose(false)}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'>
      <Box sx={style}>
        <div className={styles.container}>
          <WalletConnectModalHeader image={image} title={title} url={url} />
          {method?.includes('wallet_sendCalls') ? (
            BatchCallsView()
          ) : isWalletConnectTransaction(method) ? (
            <div className={styles.formInput}>
              <p className={styles.amountTitle}>{`-${amount || 0} ${
                walletData?.symbol || ''
              }`}</p>
              <div className={styles.boxBalance}>
                {currencySymbol[localCurrency] || ''}
                {priceValue?.toFixed(2) || '0'}
              </div>

              <div className={styles.box2Balance}>
                <DetailRow
                  label={'Chain'}
                  value={`${walletData?.chain_display_name}`}
                />
                <DetailRow
                  label={'Asset'}
                  value={`${walletData?.name} (${walletData?.symbol})`}
                />
                <DetailRow
                  label={'From'}
                  value={getCustomizePublicAddress(walletData?.address)}
                />
                <DetailRow
                  label={'To'}
                  value={getCustomizePublicAddress(
                    getTransactionRequestData?.toAddress,
                  )}
                />
              </div>
              <div className={styles.box}>
                {!!finalTransactionFee && (
                  <DetailRow
                    label={'Network Fee'}
                    value={`${finalTransactionFee} ${walletData?.chain_symbol}`}
                  />
                )}
                <DetailRow
                  label={'Max Total'}
                  value={`${currencySymbol[localCurrency]}${totalValue || 0}`}
                />
              </div>
            </div>
          ) : (
            MessageView()
          )}
          <div className={styles.bottomView}>
            <div className={styles.rowView}>
              <button className={styles.button} onClick={onPressReject}>
                {'Reject'}
              </button>
              <button
                className={styles.button}
                onClick={onPressApprove}
                disabled={isBatchTooLarge}>
                {'Approve'}
              </button>
            </div>
          </div>
        </div>
      </Box>
    </Modal>
  );
};
export default WalletConnectTransactionModal;
