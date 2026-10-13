'use client';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

import styles from './UpdateTransaction.module.css';

import GeneralButton from 'components/Button';
import {ChevronLeftIcon, InfoIcon} from 'components/Home/HomeIcons';

import {useRouter} from 'next/navigation';
import {Formik} from 'formik';
import {updateTransactionValidation} from 'utils/validationSchema';
import {getUpdateTransactionData} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSelector';
import {
  fetchTransactionData,
  resetUpdateTransactionData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {sendPendingTransactions} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  getCustomizePublicAddress,
  isCustomAddressNotSupportedChain,
} from 'dok-wallet-blockchain-networks/helper';
import Loading from 'components/Loading';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';

const UpdateTransaction = () => {
  const currentCoin = useSelector(selectCurrentCoin);
  const transactionData = useSelector(getUpdateTransactionData);
  const dispatch = useDispatch();
  const isLoading = transactionData?.isLoading;
  const isSubmitting = transactionData?.isSubmitting;
  const success = transactionData?.success;
  const [showModal, setShowModal] = useState(false);
  const isCancelTransactionRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    return () => {
      dispatch(resetUpdateTransactionData());
    };
  }, [dispatch]);

  const onSubmit = useCallback(
    values => {
      dispatch(fetchTransactionData({txHash: values?.tx}));
    },
    [dispatch],
  );

  const onSuccess = useCallback(() => {
    setShowModal(false);
    const tx = transactionData?.transactionData;
    dispatch(
      sendPendingTransactions({
        from: tx?.extraPendingTransactionData?.from,
        to: tx?.extraPendingTransactionData?.to,
        value: tx?.extraPendingTransactionData?.value,
        data: tx?.extraPendingTransactionData?.data,
        nonce: tx?.extraPendingTransactionData?.nonce,
        pendingTxHash: tx?.extraPendingTransactionData?.txHash,
        isCancelTransaction: isCancelTransactionRef.current,
        router: router,
        isFromUpdateScreen: true,
      }),
    );
  }, [dispatch, router, transactionData?.transactionData]);

  const onPressCancelTransaction = useCallback(() => {
    isCancelTransactionRef.current = true;
    setShowModal(true);
  }, []);

  const onPressSpeedupTransaction = useCallback(() => {
    isCancelTransactionRef.current = false;
    setShowModal(true);
  }, []);

  const renderBox = () => {
    const tx = transactionData?.transactionData;
    if (!tx) {
      return null;
    }
    const contractDetails = tx?.contractDetails;
    return (
      <div className={styles.formInput}>
        <section className={styles.box} aria-label='Transaction'>
          <div className={styles.itemView}>
            <span className={styles.label}>{'Chain'}</span>
            <span className={styles.boxBalance}>
              {currentCoin?.chain_display_name}
            </span>
          </div>
          <div className={styles.itemView}>
            <span className={styles.label}>{'Amount'}</span>
            <span className={styles.boxBalance}>
              {`${tx?.amount} ${
                contractDetails?.symbol || currentCoin?.symbol
              }`}
            </span>
          </div>
          <div className={styles.itemView}>
            <span className={styles.label}>{'Asset'}</span>
            <span className={styles.boxBalance}>
              {`${
                contractDetails?.name || currentCoin?.name
              } (${contractDetails?.symbol || currentCoin?.symbol})`}
            </span>
          </div>
          <div className={styles.itemView}>
            <span className={styles.label}>{'From'}</span>
            <span className={styles.boxBalance}>
              {`${
                isCustomAddressNotSupportedChain(currentCoin?.chain_name)
                  ? tx.from
                  : getCustomizePublicAddress(tx?.from)
              }`}
            </span>
          </div>
          <div className={styles.itemView}>
            <span className={styles.label}>{'To'}</span>
            <span className={styles.boxBalance}>
              {`${
                isCustomAddressNotSupportedChain(currentCoin?.chain_name)
                  ? tx?.to
                  : getCustomizePublicAddress(tx?.to)
              }`}
            </span>
          </div>
        </section>
        <section className={styles.box} aria-label='Network fee'>
          <div className={styles.itemView}>
            <span className={styles.label}>{'Network Fee'}</span>
            <span className={styles.boxBalance}>
              {`${transactionData.transactionFee} ${currentCoin?.chain_symbol}`}
            </span>
          </div>
        </section>
      </div>
    );
  };

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden='true' />
      <div className={styles.topBar}>
        <GeneralButton
          variant='unstyled'
          className={styles.back}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <h1 className={styles.pageTitle}>Update Transaction</h1>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>
      <div className={styles.formView}>
        <div className={styles.infoContainer}>
          <InfoIcon size={18} className={styles.infoIcon} />
          <p className={styles.info}>
            {`Please ensure that the transaction belongs to the ${currentCoin?.chain_display_name} chain and its status is pending.`}
          </p>
        </div>
        <Formik
          initialValues={{
            tx: '',
          }}
          validationSchema={updateTransactionValidation}
          onSubmit={onSubmit}>
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            isValid,
          }) => {
            const isDisabledButton = !values.tx || !isValid || isLoading;
            const hasError = errors.tx && touched.tx;
            return (
              <section className={styles.card}>
                <div className={styles.field}>
                  <label htmlFor='tx' className={styles.fieldLabel}>
                    Transaction Hash
                  </label>
                  <div
                    className={`${styles.inputBox} ${
                      hasError ? styles.inputBoxError : ''
                    }`}>
                    <input
                      className={styles.input}
                      id='tx'
                      type={'text'}
                      name='tx'
                      onChange={handleChange('tx')}
                      onBlur={handleBlur('tx')}
                      value={values.tx}
                      placeholder='Enter Tx hash'
                      spellCheck={false}
                    />
                  </div>
                  {errors.tx && touched.tx && (
                    <p className={styles.errorText}>{errors.fullname}</p>
                  )}
                </div>
                <GeneralButton
                  fullWidth
                  onClick={handleSubmit}
                  disabled={isDisabledButton}>
                  Fetch
                </GeneralButton>
              </section>
            );
          }}
        </Formik>
        {isLoading ? <Loading height={300} /> : renderBox()}
        {!!success && !isLoading && (
          <div className={styles.actions}>
            <GeneralButton
              fullWidth
              onClick={onPressSpeedupTransaction}
              disabled={isSubmitting}>
              Speed up transaction
            </GeneralButton>
            <GeneralButton
              variant='secondary'
              fullWidth
              onClick={onPressCancelTransaction}
              disabled={isSubmitting}>
              Cancel transaction
            </GeneralButton>
          </div>
        )}
      </div>
      <ModalConfirmTransaction
        hideModal={() => {
          setShowModal(false);
        }}
        visible={showModal}
        onSuccess={onSuccess}
      />
    </main>
  );
};

export default UpdateTransaction;
