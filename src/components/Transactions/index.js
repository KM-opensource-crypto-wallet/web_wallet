import React, {useState, useRef, useCallback, useMemo} from 'react';
import {currencySymbol} from 'data/currency';
import s from './Transactions.module.css';

const icons = require(`assets/images/icons`).default;
import dayjs from 'dayjs';

const getTxTypeConfig = (item, walletAddress) => {
  if (item?.isNFT) {
    return {icon: icons.nft, bg: '#e8eaf6', color: '#5c6bc0', label: 'NFT'};
  }
  if (item?.isBatchTransaction || item?.transactionType === 'batch') {
    return {
      icon: icons.batch,
      bg: '#e8eaf6',
      color: '#5c6bc0',
      label: 'Batch',
    };
  }
  if (item?.isCreateStaking || item?.transactionType === 'stake') {
    return {
      icon: icons.contract,
      bg: '#e8f7e0',
      color: '#71C441',
      label: 'Stake',
    };
  }
  if (item?.isWithdrawStaking || item?.transactionType === 'withdraw') {
    return {
      icon: icons.contract,
      bg: '#fff3e0',
      color: '#FF9800',
      label: 'Withdraw',
    };
  }
  if (item?.isDeactivateStaking || item?.transactionType === 'unstake') {
    return {
      icon: icons.contract,
      bg: '#fff3e0',
      color: '#FF9800',
      label: 'Unstake',
    };
  }
  if (item?.isStakingRewards) {
    return {
      icon: icons.rewards,
      bg: '#e8f7e0',
      color: '#71C441',
      label: 'Rewards',
    };
  }
  if (item?.isCreateVote) {
    return {
      icon: icons.vote,
      bg: '#e3f2fd',
      color: '#1976D2',
      label: 'Vote',
    };
  }
  if (item?.transactionType === 'smartContract') {
    return {
      icon: icons.smartContract,
      bg: '#f3e5f5',
      color: '#9c27b0',
      label: 'Contract',
    };
  }
  const isReceived =
    item?.paymentType != null
      ? item.paymentType === 1
      : item?.to?.toUpperCase() === walletAddress?.toUpperCase();
  return isReceived
    ? {
        icon: icons.receive,
        bg: '#e8f7e0',
        color: '#71C441',
        label: 'Received',
      }
    : {icon: icons.send, bg: '#fdecea', color: '#FF4444', label: 'Sent'};
};
import {useRouter} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {getPendingTransferData} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSelector';
import Spinner from 'components/Spinner';
import ModalCancelPendingTransaction from 'components/ModalCancelPendingTransaction';
import {sendPendingTransactions} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {calculateEstimateFeeForPendingTransaction} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {
  isPendingTransactionSupportedChain,
  isTransactionListNotSupported,
} from 'dok-wallet-blockchain-networks/helper';
const Transactions = ({renderList, currentCoin, localCurrency}) => {
  const dispatch = useDispatch();
  const pendingTransferData = useSelector(getPendingTransferData);
  const selectedTransactionRef = useRef(null);
  const isCancelTransactionRef = useRef(null);
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const isTransactionNotSupported = useMemo(
    () =>
      isTransactionListNotSupported(currentCoin?.chain_name, currentCoin?.type),
    [currentCoin?.chain_name, currentCoin?.type],
  );

  const calculatePendingTransaction = useCallback(
    tx => {
      setShowCancelModal(true);
      dispatch(
        calculateEstimateFeeForPendingTransaction({
          fromAddress: tx?.extraPendingTransactionData?.from,
          toAddress: tx?.extraPendingTransactionData?.to,
          value: tx?.extraPendingTransactionData?.value,
          data: tx?.extraPendingTransactionData?.data,
          nonce: tx?.extraPendingTransactionData?.nonce,
          isCancelTransaction: true,
        }),
      );
      selectedTransactionRef.current = tx;
    },
    [dispatch],
  );

  const onPressSpeedUp = useCallback(
    tx => {
      calculatePendingTransaction(tx);
      isCancelTransactionRef.current = false;
    },
    [calculatePendingTransaction],
  );
  const onPressCancel = useCallback(
    tx => {
      calculatePendingTransaction(tx);
      isCancelTransactionRef.current = true;
    },
    [calculatePendingTransaction],
  );

  const onPressYes = useCallback(() => {
    setShowCancelModal(false);
    const tx = selectedTransactionRef.current;
    dispatch(
      sendPendingTransactions({
        from: tx?.extraPendingTransactionData?.from,
        to: tx?.extraPendingTransactionData?.to,
        value: tx?.extraPendingTransactionData?.value,
        data: tx?.extraPendingTransactionData?.data,
        pendingTxHash: tx?.extraPendingTransactionData?.txHash,
        nonce: tx?.extraPendingTransactionData?.nonce,
        isCancelTransaction: isCancelTransactionRef.current,
        router,
      }),
    );
  }, [dispatch, router]);

  return (
    <>
      <div>
        {renderList?.length === 0 ? (
          <div className={{...s.section, marginTop: 40}}>
            {/* <TransactionsIcon height="114" width="114" /> */}
            <p className={s.info}>
              {isTransactionNotSupported
                ? 'To view the latest transactions, simply click on the “View All” button'
                : 'Your transactions will be shown here. Make a payment by using wallet address or scan a QR Code'}
            </p>
          </div>
        ) : (
          <>
            {renderList?.map((item, index) => {
              const txConfig = getTxTypeConfig(item, currentCoin?.address);
              const title =
                item.transactionType === 'stake'
                  ? 'Stake'
                  : item.transactionType === 'withdraw'
                    ? 'Withdraw'
                    : item.transactionType === 'unstake'
                      ? 'Unstake'
                      : item.transactionType === 'smartContract'
                        ? 'Smart Contract Call'
                        : item?.link
                          ? item.link.length > 13
                            ? `${item.link.substring(0, 13)}...`
                            : item.link
                          : '—';
              return (
                <button
                  className={s.section}
                  onClick={() => {
                    if (item?.link) {
                      router.push(
                        `/home/transactions/${encodeURIComponent(item.link)}`,
                      );
                    }
                  }}
                  key={index}>
                  <div className={s.list}>
                    <div
                      className={s.txIconCircle}
                      style={{
                        backgroundColor: txConfig.bg,
                        color: txConfig.color,
                      }}>
                      {txConfig.icon}
                    </div>
                    <div className={s.box}>
                      <div className={s.item}>
                        <p className={s.title}>{title}</p>
                        <p className={s.text}>
                          {dayjs(item.date).format('DD.MM.YYYY')}
                        </p>
                        <p className={s.text}>{item.status}</p>
                      </div>

                      <div className={s.itemNumber}>
                        <p className={s.text} style={{color: txConfig.color}}>
                          {item.amount} {currentCoin?.symbol}
                        </p>
                        <p className={s.text}>
                          {currencySymbol[localCurrency] + item.totalCourse}
                        </p>
                      </div>
                    </div>

                    <div className={s.arrow}>{icons.arrRight}</div>
                  </div>
                  {item.status === 'PENDING' &&
                    isPendingTransactionSupportedChain(
                      currentCoin.chain_name,
                    ) && (
                      <div className={s.rowView}>
                        <button
                          className={s.button}
                          onClick={event => {
                            event.stopPropagation();
                            onPressSpeedUp(item);
                          }}>
                          {icons.speedUp}
                          {'Speed Up'}
                        </button>
                        <button
                          className={`${s.button} ${s.cancelButton}`}
                          onClick={event => {
                            event.stopPropagation();
                            onPressCancel(item);
                          }}>
                          {icons.close}
                          {'Cancel'}
                        </button>
                      </div>
                    )}
                </button>
              );
            })}
          </>
        )}
      </div>
      {pendingTransferData.isSubmitting && <Spinner />}
      <ModalCancelPendingTransaction
        visible={showCancelModal}
        onPressYes={onPressYes}
        onPressNo={() => {
          setShowCancelModal(false);
        }}
        pendingTransferData={pendingTransferData}
        currentCoin={currentCoin}
        localCurrency={localCurrency}
        isCancelTransaction={isCancelTransactionRef.current}
      />
    </>
  );
};

export default Transactions;
