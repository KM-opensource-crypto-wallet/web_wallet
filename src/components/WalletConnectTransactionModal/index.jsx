import React, {useCallback, useMemo, useState} from 'react';
import styles from './WalletConnectTransactionModal.module.css';
import Modal from '@mui/material/Modal';
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
import {
  selectLivePrivateKey,
  selectWalletConnectData,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
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
import {showToast} from 'utils/toast';
import GeneralButton from 'components/Button';
// Same sheet and dApp hero as the session-proposal modal.
import sheet from 'components/WalletConnectRequestModal/WalletConnectSheet.module.css';
import DappHero from 'components/WalletConnectRequestModal/DappHero';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';
import {
  BatchCallDataView,
  MessageNode,
  stringifyPrimitive,
} from 'components/WalletConnectMessageTree';

const Icon = ({size = 16, children}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'>
    {children}
  </svg>
);

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
  // Per-session walletData is persisted without its private key; sign with
  // the live coin that owns the session's address.
  const selectSessionPrivateKey = useCallback(
    state =>
      selectLivePrivateKey(state, {
        chain_name: walletData?.chain_name,
        address: walletData?.address,
      }),
    [walletData?.chain_name, walletData?.address],
  );
  const livePrivateKey = useSelector(selectSessionPrivateKey);

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

  // Approving signs with the wallet key: the same password / biometric gate as
  // every other send applies (D2). The dApp request itself is executed by
  // approveRequest once the confirm modal succeeds.
  const [confirmVisible, setConfirmVisible] = useState(false);
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

  const approveRequest = async () => {
    // walletData is persisted without secrets; the live key is gone after an
    // idle lock or when the paired coin was removed. Never hand the thunk an
    // undefined key: it would show a progress toast and fail inside the signer.
    const privateKey = walletData?.privateKey ?? livePrivateKey;
    if (!privateKey) {
      showToast({
        type: 'errorToast',
        title: 'Wallet key unavailable',
        message:
          'Unlock your wallet and ask the dApp to send the request again.',
      });
      onPressReject();
      return;
    }
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
          privateKey,
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

  const batchCallsTotal =
    getTransactionRequestData?.finaltransactionData?.batchCallsTotal || 0;
  const isBatchTooLarge = batchCallsTotal > MAX_BATCH_CALLS;

  const BatchCallsView = () => {
    const calls =
      getTransactionRequestData?.finaltransactionData?.batchCalls || [];
    return (
      <section className={styles.section}>
        <p className={sheet.label}>{`Batch Calls (${batchCallsTotal})`}</p>
        {isBatchTooLarge && (
          <div className={sheet.notice} role='alert'>
            <Icon>
              <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
              <path d='M12 9v4' />
              <path d='M12 17h.01' />
            </Icon>
            <p className={styles.noticeText}>
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
      </section>
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
      <section className={styles.section}>
        <div className={styles.msgHeaderRow}>
          <p className={sheet.label}>{'Message'}</p>
          <button
            type='button'
            className={styles.msgCopyAllBtn}
            onClick={onCopyAll}>
            <Icon size={14}>
              <rect x='9' y='9' width='12' height='12' rx='2' />
              <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
            </Icon>
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
      </section>
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
    <>
      <Modal
        open={props.visible}
        onClose={() => props.onClose(false)}
        aria-labelledby='wc-tx-title'
        aria-describedby='wc-tx-details'
        slotProps={{backdrop: {className: sheet.backdrop}}}>
        <div className={sheet.sheet}>
          <div className={sheet.handle} />
          <div className={sheet.scroll}>
            <DappHero
              image={image}
              title={title}
              url={url}
              titleId='wc-tx-title'
            />
            <div id='wc-tx-details' className={styles.details}>
              {method?.includes('wallet_sendCalls') ? (
                BatchCallsView()
              ) : isWalletConnectTransaction(method) ? (
                <div className={styles.formInput}>
                  <div className={styles.amountBlock}>
                    <p className={styles.amountTitle}>{`-${amount || 0} ${
                      walletData?.symbol || ''
                    }`}</p>
                    <div className={styles.fiatAmount}>
                      {currencySymbol[localCurrency] || ''}
                      {priceValue?.toFixed(2) || '0'}
                    </div>
                  </div>

                  <div className={sheet.card}>
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
                  <div className={sheet.card}>
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
            </div>
          </div>
          <div className={sheet.footer}>
            <div className={sheet.actions}>
              <GeneralButton
                variant='secondary'
                fullWidth
                onClick={onPressReject}>
                {'Reject'}
              </GeneralButton>
              <GeneralButton
                fullWidth
                onClick={() => setConfirmVisible(true)}
                disabled={isBatchTooLarge}>
                {'Approve'}
              </GeneralButton>
            </div>
          </div>
        </div>
      </Modal>
      <ModalConfirmTransaction
        visible={confirmVisible}
        hideModal={() => setConfirmVisible(false)}
        onSuccess={() => {
          setConfirmVisible(false);
          approveRequest();
        }}
      />
    </>
  );
};
export default WalletConnectTransactionModal;
