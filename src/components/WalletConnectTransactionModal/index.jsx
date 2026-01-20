import React, {useCallback, useMemo} from 'react';
import styles from './WalletConnectTransactionModal.module.css';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import {currencySymbol} from 'data/currency';
import {
  convertHexToUtf8IfPossible,
  decodeSolMessage,
  getCustomizePublicAddress,
  isValidBigInt,
  parseBalance,
  safelyJsonStringify,
} from 'dok-wallet-blockchain-networks/helper';
import Image from 'next/image';

import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {getWalletConnect} from 'dok-wallet-blockchain-networks/service/walletconnect';
import {selectWalletConnectTransactionData} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import {selectWalletConnectData} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  ETH_SIGN,
  isWalletConnectTransaction,
  PERSONAL_SIGN,
} from 'dok-wallet-blockchain-networks/service/etherWalletConnect';

import {createWalletConnectTransaction} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectActions';
import BigNumber from 'bignumber.js';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  TRON_SIGN_MESSAGE,
  TRON_SIGN_TRANSACTION,
} from 'dok-wallet-blockchain-networks/service/tronWalletConnect';
import {
  SOLANA_SIGN_AND_SEND_TRANSACTION,
  SOLANA_SIGN_MESSAGE,
  SOLANA_SIGN_TRANSACTION,
} from 'dok-wallet-blockchain-networks/service/solanaWalletConnect';

const WalletConnect = require(`assets/images/WalletConnect.png`).default;

///////////////////////////////////////
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

const displayMessage = (method, message) => {
  switch (method) {
    case PERSONAL_SIGN:
    case ETH_SIGN: {
      return convertHexToUtf8IfPossible(message);
    }
    case SOLANA_SIGN_MESSAGE: {
      return decodeSolMessage(message);
    }
    case SOLANA_SIGN_TRANSACTION:
    case SOLANA_SIGN_AND_SEND_TRANSACTION: {
      return safelyJsonStringify(parseSolanaSignTransaction(message));
    }
    default: {
      return safelyJsonStringify(message);
    }
  }
};

const WalletConnectTransactionModal = props => {
  const transactionData = useSelector(selectWalletConnectTransactionData);
  const dispatch = useDispatch();
  const image = transactionData?.peerMeta?.icons[0] || null;
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
    if (
      transactionData?.chainId?.includes('tron') ||
      transactionData?.chainId?.includes('solana')
    ) {
      if (
        transactionData?.method === TRON_SIGN_MESSAGE ||
        transactionData?.method === SOLANA_SIGN_MESSAGE
      ) {
        return {
          signTypeData: transactionData?.params?.message,
        };
      }
      if (transactionData?.method === TRON_SIGN_TRANSACTION) {
        return {
          finaltransactionData:
            transactionData?.params?.transaction?.transaction,
          signTypeData: transactionData?.params?.transaction?.transaction,
        };
      }
      if (
        transactionData?.method === SOLANA_SIGN_TRANSACTION ||
        transactionData?.method === SOLANA_SIGN_AND_SEND_TRANSACTION
      ) {
        return {
          finaltransactionData: transactionData?.params,
          signTypeData: transactionData?.params,
        };
      }
    } else {
      const finaltransactionData = transactionData?.params[0] || {};
      const signTypeData =
        transactionData?.method === PERSONAL_SIGN
          ? transactionData?.params[0]
          : transactionData?.params[1];
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
          transactionFees,
          fiatTransactionFees,
          toAddress,
        };
      }
      return {
        finaltransactionData,
        signTypeData,
      };
    }
  }, [transactionData, walletData]);

  const onPressApprove = async () => {
    try {
      props?.onClose?.();
      dispatch(
        createWalletConnectTransaction({
          transactionData: getTransactionRequestData?.finaltransactionData,
          chain_name: walletData?.chain_name?.toLowerCase(),
          privateKey: walletData?.privateKey,
          requestId: transactionData?.id,
          sessionId,
          id,
          topic,
          method,
          signTypeData: getTransactionRequestData?.signTypeData,
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

  const MessageView = () => {
    const signTypeData = getTransactionRequestData?.signTypeData;
    const message = displayMessage(method, signTypeData);

    return (
      <div className={styles.contentContainerStyle}>
        <p className={styles.chainTitle}>{'Message'}</p>
        <div className={styles.scrollView}>
          <p style={styles.messageStyle}>{message}</p>
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
          <Image
            src={WalletConnect}
            alt='connect'
            className={styles.mainImageStyle}
          />
          <div className={styles.mainView}>
            {image && (
              <Image
                src={image}
                className={styles.imageStyle}
                alt={'image'}
                width={80}
                height={80}
              />
            )}
            <div className={styles.box}>
              <p className={styles.title}>{title}</p>
              <p className={styles.url}>{url}</p>
            </div>
          </div>
          <div className={styles.borderView} />
          {isWalletConnectTransaction(method) ? (
            <div className={styles.formInput}>
              <p className={styles.amountTitle}>{`-${amount || 0} ${
                walletData?.symbol || ''
              }`}</p>
              <div className={styles.boxBalance}>
                {currencySymbol[localCurrency] || ''}
                {priceValue?.toFixed(2) || '0'}
              </div>

              <div className={styles.box2Balance}>
                <div className={styles.transferItemView}>
                  <p className={styles.transferTitle}>{'Chain'}</p>
                  <p
                    className={
                      styles.boxBalance
                    }>{`${walletData?.chain_display_name}`}</p>
                </div>
                <div className={styles.transferItemView}>
                  <p className={styles.transferTitle}>{'Asset'}</p>
                  <p
                    className={
                      styles.boxBalance
                    }>{`${walletData?.name} (${walletData?.symbol})`}</p>
                </div>
                <div className={styles.transferItemView}>
                  <p className={styles.transferTitle}>{'From'}</p>
                  <p
                    className={styles.boxBalance}>{`${getCustomizePublicAddress(
                    walletData?.address,
                  )}`}</p>
                </div>
                <div className={styles.transferItemView}>
                  <p className={styles.transferTitle}>{'To'}</p>
                  <p className={styles.boxBalance}>
                    {`${getCustomizePublicAddress(
                      getTransactionRequestData?.toAddress,
                    )}`}
                  </p>
                </div>
              </div>
              <div className={styles.box}>
                {!!finalTransactionFee && (
                  <div className={styles.transferItemView}>
                    <p className={styles.transferTitle}>{'Network Fee'}</p>
                    <p
                      className={
                        styles.boxBalance
                      }>{`${finalTransactionFee} ${walletData?.chain_symbol}`}</p>
                  </div>
                )}
                <div className={styles.transferItemView}>
                  <p className={styles.transferTitle}>{'Max Total'}&nbsp;</p>
                  <p className={styles.boxBalance}>{`${
                    currencySymbol[localCurrency]
                  }${totalValue || 0}`}</p>
                </div>
              </div>
            </div>
          ) : (
            MessageView()
          )}
          <div className={styles.bottomView}>
            <div className={styles.rowView}>
              <button className={styles.button} onClick={onPressReject}>
                <p className={styles.buttonTitle}>{'Reject'}</p>
              </button>
              <button
                // disabled={!isValidChain}
                className={styles.button}
                // style={
                //   {
                //     // backgroundColor: !isValidChain
                //     //   ? 'var(--gray)'
                //     //   : 'var(--background)',
                //   }
                // }
                onClick={onPressApprove}>
                {'Approve'}
              </button>
            </div>
          </div>
          {/* </div> */}
        </div>
      </Box>
    </Modal>
  );
};
export default WalletConnectTransactionModal;
