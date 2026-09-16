'use client';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

import styles from './UpdateTransaction.module.css';

import PageTitle from 'components/PageTitle';

import {useRouter} from 'next/navigation';
import {Formik} from 'formik';
import {updateTransactionValidation} from 'utils/validationSchema';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
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
const icons = require(`assets/images/icons`).default;

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
        <div className={styles.box}>
          <div className={styles.itemView}>
            <p className={styles.title}>{'Chain'}</p>
            <p className={styles.boxBalance}>
              {currentCoin?.chain_display_name}
            </p>
          </div>
          <div className={styles.itemView}>
            <p className={styles.title}>{'Amount'}</p>
            <p className={styles.boxBalance}>{`${tx?.amount} ${
              contractDetails?.symbol || currentCoin?.symbol
            }`}</p>
          </div>
          <div className={styles.itemView}>
            <p className={styles.title}>{'Asset'}</p>
            <p className={styles.boxBalance}>{`${
              contractDetails?.name || currentCoin?.name
            } (${contractDetails?.symbol || currentCoin?.symbol})`}</p>
          </div>
          <div className={styles.itemView}>
            <p className={styles.title}>{'From'}</p>
            <p className={styles.boxBalance}>{`${
              isCustomAddressNotSupportedChain(currentCoin?.chain_name)
                ? tx.from
                : getCustomizePublicAddress(tx?.from)
            }`}</p>
          </div>
          <div className={styles.itemView}>
            <p className={styles.title}>{'To'}</p>
            <p className={styles.boxBalance}>{`${
              isCustomAddressNotSupportedChain(currentCoin?.chain_name)
                ? tx?.to
                : getCustomizePublicAddress(tx?.to)
            }`}</p>
          </div>
        </div>
        <div className={styles.box}>
          <div className={styles.itemView}>
            <p className={styles.title}>{'Network Fee'}</p>
            <p className={styles.boxBalance}>
              {`${transactionData.transactionFee} ${currentCoin?.chain_symbol}`}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageTitle title='Update Transaction' />
      <div className={styles.formView}>
        <div className={styles.infoContainer}>
          <div className={styles.infoIcon}>{icons.exclamationcircle}</div>
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
            return (
              <>
                <FormControl variant='outlined' fullWidth>
                  <InputLabel
                    sx={{
                      color:
                        errors.tx && touched.tx
                          ? 'red'
                          : 'var(--borderActiveColor)',
                    }}>
                    Transaction Hash
                  </InputLabel>
                  <OutlinedInput
                    fullWidth
                    id='tx'
                    type={'text'}
                    name='tx'
                    onChange={handleChange('tx')}
                    onBlur={handleBlur('tx')}
                    value={values.tx}
                    placeholder='Enter Tx hash'
                    label='Tx hash'
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor:
                          errors.tx && touched.tx
                            ? 'red'
                            : 'var(--sidebarIcon)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor:
                          errors.tx && touched.tx
                            ? 'red'
                            : 'var(--borderActiveColor)',
                      },
                      '& .MuiInputLabel-outlined': {
                        color:
                          errors.tx && touched.tx
                            ? 'red'
                            : 'var(--sidebarIcon)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--sidebarIcon) !important',
                      },
                    }}
                  />
                  <button
                    className={styles.button}
                    onClick={handleSubmit}
                    disabled={isDisabledButton}
                    style={
                      isDisabledButton ? {backgroundColor: 'var(--gray)'} : {}
                    }>
                    Fetch
                  </button>
                </FormControl>

                {errors.tx && touched.tx && (
                  <p className={styles.errorText}>{errors.fullname}</p>
                )}
              </>
            );
          }}
        </Formik>
        {isLoading ? <Loading height={300} /> : renderBox()}
        {!!success && !isLoading && (
          <>
            <button
              className={styles.button}
              onClick={onPressSpeedupTransaction}
              disabled={isSubmitting}
              style={isSubmitting ? {backgroundColor: 'var(--gray)'} : {}}>
              Speed up transaction
            </button>
            <button
              className={styles.button}
              onClick={onPressCancelTransaction}
              disabled={isSubmitting}
              style={isSubmitting ? {backgroundColor: 'var(--gray)'} : {}}>
              Cancel transaction
            </button>
          </>
        )}
      </div>
      <ModalConfirmTransaction
        hideModal={() => {
          setShowModal(false);
        }}
        visible={showModal}
        onSuccess={onSuccess}
      />
    </div>
  );
};

export default UpdateTransaction;
