'use client';
import React from 'react';
import styles from './WithdrawStaking.module.css';
import {currencySymbol} from 'data/currency';
import useStaking from 'src/hooks/protectedRoutes/wallet/home/send/useStaking';
import StakingItem from 'components/StakingItem';
import CoinIcon from 'components/CoinIcon';
import PriceChange from 'components/PriceChange';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon} from 'components/Home/HomeIcons';
import SelectInput from 'components/SelectInput';

const WithdrawStaking = () => {
  const {
    goBack,
    currentCoin,
    localCurrency,
    symbol,
    isValidatorSupport,
    isResourceSupport,
    resourceData,
    renderResourceValue,
    withdrawTitle: title,
    isStakingRewards,
    withdrawAvailableAmount: availableAmount,
    withdrawAvailableAmountCurrency: availableAmountCurrency,
    withdrawAmount: amount,
    withdrawCurrencyAmount: currencyAmount,
    withdrawResourceType: resourceType,
    withdrawErrors: errors,
    withdrawAmountError: amountError,
    isEVMUnstaking: isEVMStaking,
    isMaxCheckbox,
    toggleMaxCheckbox,
    disableTextInput,
    setWithdrawMax: setMax,
    onWithdrawAmountChange,
    onWithdrawCurrencyAmountChange,
    onWithdrawResourceTypeChange,
    handleWithdrawSubmit: handleSubmitForm,
    isWithdrawValid: isValid,
    selectedStake,
    stakingProviderList,
    hideResource,
  } = useStaking('withdraw');

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
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>
      <div className={styles.column}>
        <form
          className={styles.form}
          noValidate
          onSubmit={event => {
            event.preventDefault();
            handleSubmitForm();
          }}>
          <section className={styles.balanceCard} aria-label='Staked amount'>
            <span className={styles.coinIcon}>
              <CoinIcon item={currentCoin} />
            </span>
            <div className={styles.balanceText}>
              <span className={styles.label}>
                {isStakingRewards ? 'Rewards available' : 'Staked amount'}
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

          {isEVMStaking && (
            <GeneralButton
              variant='unstyled'
              role='switch'
              aria-checked={isMaxCheckbox}
              className={`${styles.toggleCard} ${
                isMaxCheckbox ? styles.toggleCardOn : ''
              }`}
              onClick={toggleMaxCheckbox}>
              <span className={styles.toggleText}>
                <span className={styles.toggleTitle}>
                  Unstake entire balance
                </span>
                <span className={styles.toggleHint}>
                  Redeem all staked tokens at once
                </span>
              </span>
              <span className={styles.switch} aria-hidden='true'>
                <span className={styles.switchKnob} />
              </span>
            </GeneralButton>
          )}

          <section className={styles.card}>
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor='amount' className={styles.label}>
                  Amount
                </label>
                {!disableTextInput && (
                  <GeneralButton
                    variant='chip'
                    className={styles.maxChip}
                    onClick={setMax}>
                    Max
                  </GeneralButton>
                )}
              </div>
              <div
                className={`${styles.amountBox} ${
                  amountError ? styles.inputBoxError : ''
                } ${disableTextInput ? styles.amountBoxLocked : ''}`}>
                <div className={styles.amountRow}>
                  <input
                    id='amount'
                    className={`${styles.input} ${styles.amountInput}`}
                    placeholder='0'
                    inputMode='decimal'
                    name='amount'
                    readOnly={disableTextInput}
                    onChange={onWithdrawAmountChange}
                    value={amount}
                  />
                  <span className={styles.unit}>{symbol}</span>
                </div>
                <div className={styles.fiatRow}>
                  <span className={styles.fiatPrefix}>≈</span>
                  <input
                    aria-label={`Amount in ${localCurrency}`}
                    className={`${styles.input} ${styles.fiatInput}`}
                    placeholder='0.00'
                    inputMode='decimal'
                    name='currencyAmount'
                    readOnly={disableTextInput}
                    onChange={onWithdrawCurrencyAmountChange}
                    value={currencyAmount}
                  />
                  <span className={styles.fiatUnit}>{localCurrency}</span>
                </div>
              </div>
              {disableTextInput && !isEVMStaking && (
                <p className={styles.hint}>
                  The full amount is used for this action.
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

            {isEVMStaking && stakingProviderList.length > 0 && (
              <div className={styles.field}>
                <span className={styles.label}>Staking provider</span>
                <div className={styles.itemBox}>
                  <StakingItem item={selectedStake} isWithdraw={false} />
                </div>
              </div>
            )}
            {isValidatorSupport && !isEVMStaking && (
              <div className={styles.field}>
                <span className={styles.label}>Validator</span>
                <div className={styles.itemBox}>
                  <StakingItem
                    item={selectedStake}
                    isWithdraw={false}
                    showReward={false}
                  />
                </div>
              </div>
            )}
            {isResourceSupport && !!resourceData?.length && !hideResource && (
              <div className={styles.field}>
                <span className={styles.label}>Resource type</span>
                <div className={styles.selectBox}>
                  <SelectInput
                    className={styles.selectInput}
                    placeholder={'Select resource type'}
                    listData={resourceData}
                    onValueChange={onWithdrawResourceTypeChange}
                    value={resourceType?.value}
                    renderValue={renderResourceValue}
                  />
                </div>
              </div>
            )}
          </section>

          <GeneralButton type='submit' fullWidth disabled={!isValid}>
            Next
          </GeneralButton>
        </form>
      </div>
    </main>
  );
};

export default WithdrawStaking;
