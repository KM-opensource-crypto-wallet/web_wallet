'use client';
import React from 'react';
import {Formik} from 'formik';
import {currencySymbol} from 'src/data/lists/currency';
import useStaking from 'src/hooks/protectedRoutes/wallet/home/send/useStaking';
import SelectInput from 'components/SelectInput';
import ModalAllowanceInfo from 'components/ModalAllowanceInfo';
import Loading from 'components/Loading';
import styles from './CreateStaking.module.css';
import CoinIcon from 'components/CoinIcon';
import PriceChange from 'components/PriceChange';
import GeneralButton from 'components/Button';
import Screen from 'components/Screen';

const CreateStaking = () => {
  const {
    isLoading,
    currentCoin,
    localCurrency,
    symbol,
    availableAmount,
    availableAmountCurrency,
    formikRef,
    initialValues,
    validationSchema,
    handleSubmitForm,
    allowanceLoading,
    setMax,
    onAmountChange,
    onCurrencyAmountChange,
    isValidatorSupport,
    validatorList,
    onValidatorChange,
    renderValidatorValue,
    isResourceSupport,
    resourceData,
    onResourceTypeChange,
    renderResourceValue,
    allowanceModalVisible,
    closeAllowanceModal,
    approveLoading,
    pendingAmount,
    pendingStakingProviderName,
    onAllowanceContinue,
  } = useStaking('create');

  return (
    <Screen className={styles.page} title={<>Stake {symbol}</>}>
      <div className={styles.column}>
        {isLoading ? (
          <div className={styles.loading}>
            <Loading />
          </div>
        ) : (
          <Formik
            innerRef={formikRef}
            enableReinitialize={true}
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmitForm}>
            {({
              handleBlur,
              handleSubmit,
              values,
              errors,
              isValid,
              setFieldValue,
              touched,
            }) => {
              const amountError =
                (touched.amount && errors.amount) ||
                (touched.currencyAmount && errors.currencyAmount);
              const minAmount = values?.validatorPubKey?.options?.minAmount;
              return (
                <form
                  className={styles.form}
                  noValidate
                  onSubmit={event => {
                    event.preventDefault();
                    handleSubmit();
                  }}>
                  <section className={styles.balanceCard} aria-label='Balance'>
                    <span className={styles.coinIcon}>
                      <CoinIcon item={currentCoin} />
                    </span>
                    <div className={styles.balanceText}>
                      <span className={styles.label}>
                        Available for staking
                        <PriceChange
                          value={currentCoin?.priceChange24h}
                          className={styles.labelChange}
                        />
                      </span>
                      <p className={styles.balance}>
                        {availableAmount}{' '}
                        <span className={styles.balanceSymbol}>{symbol}</span>
                      </p>
                    </div>
                    <span className={styles.balanceFiat}>
                      {currencySymbol[localCurrency] || ''}
                      {availableAmountCurrency}
                    </span>
                  </section>

                  <section className={styles.card}>
                    <div className={styles.field}>
                      <div className={styles.labelRow}>
                        <label htmlFor='amount' className={styles.label}>
                          Staking amount
                        </label>
                        <GeneralButton
                          variant='chip'
                          className={styles.maxChip}
                          onClick={() => setMax(setFieldValue)}>
                          Max
                        </GeneralButton>
                      </div>
                      <div
                        className={`${styles.amountBox} ${
                          amountError ? styles.inputBoxError : ''
                        }`}>
                        <div className={styles.amountRow}>
                          <input
                            id='amount'
                            className={`${styles.input} ${styles.amountInput}`}
                            placeholder='0'
                            inputMode='decimal'
                            name='amount'
                            onChange={event =>
                              onAmountChange(event, setFieldValue)
                            }
                            onBlur={handleBlur('amount')}
                            value={values.amount}
                          />
                          <span className={styles.unit}>{symbol}</span>
                        </div>
                        <div className={styles.fiatRow}>
                          <span className={styles.fiatPrefix}>≈</span>
                          <input
                            aria-label={`Staking amount in ${localCurrency}`}
                            className={`${styles.input} ${styles.fiatInput}`}
                            placeholder='0.00'
                            inputMode='decimal'
                            name='currencyAmount'
                            onChange={event =>
                              onCurrencyAmountChange(event, setFieldValue)
                            }
                            onBlur={handleBlur('currencyAmount')}
                            value={values.currencyAmount}
                          />
                          <span className={styles.fiatUnit}>
                            {localCurrency}
                          </span>
                        </div>
                      </div>
                      {minAmount != null && (
                        <p className={styles.hint}>
                          {`Minimum: ${minAmount} ${symbol}`}
                        </p>
                      )}
                      {errors.amount && (
                        <p className={styles.error} role='alert'>
                          {errors.amount}
                        </p>
                      )}
                      {errors.currencyAmount && (
                        <p className={styles.error} role='alert'>
                          {errors.currencyAmount}
                        </p>
                      )}
                    </div>

                    {isValidatorSupport && (
                      <div className={styles.field}>
                        <span className={styles.label}>Validator</span>
                        <div className={styles.selectBox}>
                          <SelectInput
                            className={styles.selectInput}
                            placeholder={'Select validator'}
                            listData={validatorList}
                            onValueChange={value =>
                              onValidatorChange(value, setFieldValue)
                            }
                            value={values.validatorPubKey?.value}
                            renderValue={renderValidatorValue}
                          />
                        </div>
                      </div>
                    )}

                    {isResourceSupport && !!resourceData?.length && (
                      <div className={styles.field}>
                        <span className={styles.label}>Resource type</span>
                        <div className={styles.selectBox}>
                          <SelectInput
                            className={styles.selectInput}
                            placeholder={'Select resource type'}
                            listData={resourceData}
                            onValueChange={value =>
                              onResourceTypeChange(value, setFieldValue)
                            }
                            value={values.resourceType?.value}
                            renderValue={renderResourceValue}
                          />
                        </div>
                      </div>
                    )}
                  </section>

                  <GeneralButton
                    type='submit'
                    fullWidth
                    disabled={!isValid}
                    loading={allowanceLoading}
                    loadingLabel='Checking allowance…'>
                    Next
                  </GeneralButton>
                </form>
              );
            }}
          </Formik>
        )}
      </div>
      <ModalAllowanceInfo
        visible={allowanceModalVisible}
        onClose={closeAllowanceModal}
        tokenSymbol={currentCoin?.symbol}
        requiredAmount={pendingAmount}
        availableAmount={availableAmount}
        approveLoading={approveLoading}
        onContinue={onAllowanceContinue}
        chainSymbol={currentCoin?.chain_symbol}
        chainName={currentCoin?.chain_name}
        stakingProviderName={pendingStakingProviderName}
        amount={pendingAmount}
      />
    </Screen>
  );
};

export default CreateStaking;
