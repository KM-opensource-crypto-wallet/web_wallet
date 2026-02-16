import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {currencySymbol} from 'data/currency';
import s from './Transactions.module.css';

const icons = require(`assets/images/icons`).default;
import {popupCenter} from 'utils/common';
import dayjs from 'dayjs';
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
              const isReceived =
                item?.to?.toUpperCase() === currentCoin?.address?.toUpperCase();
              return (
                <button
                  className={s.section}
                  onClick={async () => {
                    popupCenter({
                      url: item?.url,
                    });
                  }}
                  key={index}>
                  <div className={s.list}>
                    <div className={s.box}>
                      <div className={s.item}>
                        <p className={s.title}>{item.link}</p>
                        <div className={s.field}>
                          <p className={s.text}>
                            {dayjs(item.date).format('DD.MM.YYYY')}
                          </p>
                          <p className={s.hyphen}>&#45;</p>
                          <p className={s.text}>{item.status}</p>
                        </div>
                      </div>

                      <div className={s.itemNumber}>
                        <div className={s.field}>
                          <>
                            <p
                              className={s.text}
                              style={{
                                marginRight: 5,
                                color: isReceived ? 'green' : 'red',
                              }}>
                              {item.amount}
                            </p>
                            <p
                              className={s.text}
                              style={{
                                color: isReceived ? 'green' : 'red',
                              }}>
                              {currentCoin?.symbol}
                            </p>
                          </>
                        </div>
                        <p className={s.text}>
                          {currencySymbol[localCurrency] + item.totalCourse}
                        </p>
                      </div>
                    </div>

                    <div className={s.arrow}>{icons.arrRight} </div>
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
