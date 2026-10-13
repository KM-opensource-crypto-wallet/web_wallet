'use client';
import React from 'react';

import styles from './UpdateTransaction.module.css';

import GeneralButton from 'components/Button';
import {ChevronLeftIcon, InfoIcon} from 'components/Home/HomeIcons';

import {Formik} from 'formik';
import Loading from 'components/Loading';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';
import useTransaction from 'src/hooks/protectedRoutes/wallet/home/send/useTransaction';

const UpdateTransaction = () => {
  const {
    goBack,
    currentCoin,
    updateTransactionData,
    isUpdateLoading,
    isUpdateSubmitting,
    updateSuccess,
    updateTransactionValidation,
    onFetchUpdateTransaction,
    formatUpdateAddress,
    onPressSpeedupTransaction,
    onPressCancelTransaction,
    showUpdateModal,
    closeUpdateModal,
    onUpdateConfirmed,
  } = useTransaction('update');

  const renderBox = () => {
    const tx = updateTransactionData?.transactionData;
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
              {`${formatUpdateAddress(tx?.from)}`}
            </span>
          </div>
          <div className={styles.itemView}>
            <span className={styles.label}>{'To'}</span>
            <span className={styles.boxBalance}>
              {`${formatUpdateAddress(tx?.to)}`}
            </span>
          </div>
        </section>
        <section className={styles.box} aria-label='Network fee'>
          <div className={styles.itemView}>
            <span className={styles.label}>{'Network Fee'}</span>
            <span className={styles.boxBalance}>
              {`${updateTransactionData.transactionFee} ${currentCoin?.chain_symbol}`}
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
          onClick={goBack}>
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
          onSubmit={onFetchUpdateTransaction}>
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            isValid,
          }) => {
            const isDisabledButton = !values.tx || !isValid || isUpdateLoading;
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
        {isUpdateLoading ? <Loading height={300} /> : renderBox()}
        {!!updateSuccess && !isUpdateLoading && (
          <div className={styles.actions}>
            <GeneralButton
              fullWidth
              onClick={onPressSpeedupTransaction}
              disabled={isUpdateSubmitting}>
              Speed up transaction
            </GeneralButton>
            <GeneralButton
              variant='secondary'
              fullWidth
              onClick={onPressCancelTransaction}
              disabled={isUpdateSubmitting}>
              Cancel transaction
            </GeneralButton>
          </div>
        )}
      </div>
      <ModalConfirmTransaction
        hideModal={closeUpdateModal}
        visible={showUpdateModal}
        onSuccess={onUpdateConfirmed}
      />
    </main>
  );
};

export default UpdateTransaction;
