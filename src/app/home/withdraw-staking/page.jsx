'use client';
import React, {useState, useRef, useMemo, useLayoutEffect} from 'react';
import styles from './WithdrawStaking.module.css';
import {useSelector, useDispatch} from 'react-redux';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  calculateEstimateFee,
  setCurrentTransferData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {currencySymbol} from 'data/currency';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import BigNumber from 'bignumber.js';
import {
  isHaveResourceTypeInCreateStakingScreen,
  isValidatorSupportCreateStakingScreen,
  multiplyBNWithFixed,
  resourcesData,
  validateBigNumberStr,
  validateNumber,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import StakingItem from 'components/StakingItem';
import {getRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraSelectors';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {useRouter} from 'next/navigation';
import PageTitle from 'components/PageTitle';
import InputField from './InputField';
import SelectInput from 'components/SelectInput';
import {setExchangeSuccess} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';

const disableTextInputChain = ['solana'];

const isDisableTextInput = chain_name =>
  disableTextInputChain.includes(chain_name);

const WithdrawStaking = () => {
  const router = useRouter();
  const titleRef = useRef('Withdraw Staking');
  const routeData = useSelector(getRouteStateData);
  const currentRouteData = routeData?.withdrawStaking;
  const selectedStake = currentRouteData?.selectedStake;
  const isWithdrawStaking = currentRouteData?.isWithdrawStaking;
  const isDeactivateStaking = currentRouteData?.isDeactivateStaking;
  const isStakingRewards = currentRouteData?.isStakingRewards;
  const hideResource = currentRouteData?.hideResource;
  console.log('istatke,isStakingRew', isStakingRewards);
  const currentCoin = useSelector(selectCurrentCoin);
  const localCurrency = useSelector(getLocalCurrency);
  const isValidatorSupport = useMemo(() => {
    return isValidatorSupportCreateStakingScreen(currentCoin?.chain_name);
  }, [currentCoin?.chain_name]);

  const isResourceSupport = useMemo(() => {
    return isHaveResourceTypeInCreateStakingScreen(currentCoin?.chain_name);
  }, [currentCoin?.chain_name]);

  const resourceData = useMemo(() => {
    return isResourceSupport ? resourcesData[currentCoin?.chain_name] : null;
  }, [isResourceSupport, currentCoin?.chain_name]);

  const [state, setState] = useState({
    resourceType:
      isResourceSupport && isDeactivateStaking ? resourceData?.[1] : null,
    amount: selectedStake?.amount || '0',
    currencyAmount: selectedStake?.fiatAmount || '0',
    errors: {},
  });
  const {amount, currencyAmount, errors, resourceType} = state;

  const availableAmount = useMemo(() => {
    return selectedStake?.amount?.toString()
      ? selectedStake?.amount?.toString()
      : state?.resourceType?.value === 'ENERGY'
        ? currentCoin?.energyBalance
        : currentCoin?.bandwidthBalance;
  }, [
    currentCoin?.bandwidthBalance,
    currentCoin?.energyBalance,
    selectedStake?.amount,
    state.resourceType?.value,
  ]);

  const availableAmountCurrency = useMemo(() => {
    if (selectedStake?.fiatAmount?.toString()) {
      return selectedStake?.fiatAmount?.toString();
    } else {
      const energyBalanceBN = new BigNumber(currentCoin?.energyBalance || 0);
      const bandwidthBalanceBN = new BigNumber(
        currentCoin?.bandwidthBalance || 0,
      );
      const currencyRateBN = new BigNumber(currentCoin?.currencyRate || 0);
      return currencyRateBN
        .multipliedBy(
          state.resourceType?.value === 'ENERGY'
            ? energyBalanceBN
            : bandwidthBalanceBN,
        )
        .toFixed(2);
    }
  }, [
    currentCoin?.bandwidthBalance,
    currentCoin?.currencyRate,
    currentCoin?.energyBalance,
    selectedStake?.fiatAmount,
    state.resourceType?.value,
  ]);
  const disableTextInput =
    isDisableTextInput(currentCoin?.chain_name) || !isDeactivateStaking;

  const dispatch = useDispatch();

  useLayoutEffect(() => {
    if (isWithdrawStaking) {
      titleRef.current = 'Withdraw Staking';
    } else if (isDeactivateStaking) {
      titleRef.current = 'Deactivate Staking';
    } else if (isStakingRewards) {
      titleRef.current = 'Claim Staking Rewards';
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWithdrawStaking, isDeactivateStaking, isStakingRewards]);

  const handleSubmitForm = async () => {
    const localErrors = checkError(amount, currencyAmount);
    if (Object.keys(localErrors).length === 0) {
      dispatch(
        setCurrentTransferData({
          validatorPubKey: selectedStake?.validator_address,
          stakingAddress: selectedStake?.staking_address,
          validatorName: selectedStake?.validatorInfo?.name,
          currentCoin,
          amount: validateBigNumberStr(amount),
          isStakingRewards: isStakingRewards,
          resourceType: resourceType?.value,
        }),
      );
      dispatch(
        calculateEstimateFee({
          isFetchNonce: true,
          fromAddress: currentCoin?.address,
          amount: validateBigNumberStr(amount),
          validatorPubKey: selectedStake?.validator_address,
          stakingAddress: selectedStake?.staking_address,
          isWithdrawStaking: isWithdrawStaking,
          isDeactivateStaking: isDeactivateStaking,
          isStakingRewards: isStakingRewards,
          resourceType: resourceType?.value,
        }),
      );
      dispatch(setExchangeSuccess(false));
      dispatch(
        setRouteStateData({
          transfer: {
            fromScreen: 'Staking',
            isDeactivateStaking,
            isWithdrawStaking,
            isStakingRewards,
          },
        }),
      );
      router.push('/home/confirm-staking');
    } else {
      setState({
        ...state,
        errors: localErrors,
      });
    }
  };

  const checkError = (localAmount, localCurrencyAmount) => {
    const error = {};
    const numLocalAmount = validateNumber(localAmount);
    const numLocalCurrencyAmount = validateNumber(localCurrencyAmount);

    if (
      !numLocalAmount ||
      !numLocalCurrencyAmount ||
      numLocalAmount < 0 ||
      numLocalCurrencyAmount < 0
    ) {
      if (!numLocalAmount || numLocalAmount < 0) {
        error.amount = 'Amount is required and must be a positive number';
      }
      if (numLocalCurrencyAmount < 0) {
        error.currencyAmount =
          'Currency Amount is required and must be a positive number';
      }
      return error;
    }
    const amountBN = new BigNumber(localAmount || 0);
    const currencyAmountBN = new BigNumber(localCurrencyAmount || 0);
    const availableAmountBN = new BigNumber(availableAmount || 0);
    const availableCurrencyAmountBN = new BigNumber(localCurrencyAmount || 0);
    if (amountBN.gt(availableAmountBN)) {
      error.amount = 'Amount is greater than available amount';
    }
    if (currencyAmountBN.gt(availableCurrencyAmountBN)) {
      error.currencyAmount = 'Currency Amount is greater than available amount';
    }
    return error;
  };
  const amountBN = new BigNumber(amount);
  const availableAmountBN = new BigNumber(availableAmount);
  const isValid = validateNumber(amount) && amountBN.lte(availableAmountBN);

  return (
    <div className={styles.contentContainerStyle}>
      <div>
        <PageTitle title={titleRef.current} />
        <div style={{flex: 1}}>
          <div
            className={styles.container}
            style={{
              padding: '20px',
            }}>
            <div className={styles.formInput}>
              <div className={styles.title}>Staking Amount</div>
              <div className={styles.box}>
                <div className={styles.boxTitle}>{availableAmount}</div>
                <div className={styles.boxTitle}>{currentCoin?.symbol}</div>
              </div>
              <div className={styles.box}>
                <div className={styles.boxBalance}>
                  {currencySymbol[localCurrency] || ''}
                  {availableAmountCurrency}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                }}>
                <div className={styles.boxInput}>
                  <div className={styles.listTitle}>Staking Amount</div>
                  <div className={styles.inputView}>
                    <InputField
                      label='Enter amount for staking'
                      name='amount'
                      inputSx={{
                        color: errors.amount
                          ? 'red'
                          : 'var(--borderActiveColor)',
                      }}
                      inputError={errors.amount}
                      onChange={event => {
                        const tempValues = validateNumberInInput(
                          event.target.value,
                          currentCoin?.decimal,
                        );
                        const tempAmount = multiplyBNWithFixed(
                          tempValues,
                          currentCoin?.currencyRate,
                          2,
                        );
                        const localErrors = checkError(tempValues, tempAmount);
                        setState({
                          ...state,
                          currencyAmount: tempAmount,
                          amount: tempValues,
                          errors: localErrors,
                        });
                      }}
                      disableTextInput={disableTextInput}
                      value={amount}
                      maxBtnClick={() => {
                        setState({
                          ...state,
                          currencyAmount: availableAmountCurrency,
                          amount: availableAmount,
                        });
                      }}
                    />
                  </div>
                  {errors.amount && (
                    <div className={styles.textConfirm}>{errors.amount}</div>
                  )}
                </div>
                <div className={styles.boxInput}>
                  <div className={styles.listTitle}>Fiat Staking Amount</div>
                  <div className={styles.inputView}>
                    <InputField
                      label={`Enter ${localCurrency} amount for staking`}
                      name='currencyAmount'
                      inputSx={{
                        color: errors.currencyAmount
                          ? 'red'
                          : 'var(--borderActiveColor)',
                      }}
                      inputError={errors.currencyAmount}
                      onChange={event => {
                        const tempValues = validateNumberInInput(
                          event.target.value,
                          2,
                        );
                        const tempAmount = new BigNumber(tempValues)
                          .dividedBy(new BigNumber(currentCoin?.currencyRate))
                          .toFixed(
                            currentCoin?.decimal
                              ? Number(currentCoin?.decimal)
                              : 8,
                          );
                        const localErrors = checkError(tempAmount, tempValues);
                        setState({
                          ...state,
                          amount: tempAmount,
                          currencyAmount: tempValues,
                          errors: localErrors,
                        });
                      }}
                      disableTextInput={disableTextInput}
                      value={currencyAmount}
                      maxBtnClick={() => {
                        setState({
                          ...state,
                          amount: availableAmount,
                          currencyAmount: availableAmountCurrency,
                        });
                      }}
                    />
                  </div>
                  {errors.amount && (
                    <div className={styles.textConfirm}>{errors.amount}</div>
                  )}
                </div>
                {isValidatorSupport && (
                  <div className={styles.boxInput}>
                    <div className={styles.listTitle}>Validator</div>
                    <StakingItem item={selectedStake} isWithdraw={false} />
                  </div>
                )}
                {isResourceSupport && resourceData?.length && !hideResource && (
                  <div className={styles.boxInput}>
                    <div className={styles.listTitle}>Resource Type</div>
                    <div className={styles.addressView}>
                      <SelectInput
                        className={styles.selectInput}
                        placeholder={'Select Resource Type'}
                        listData={resourceData}
                        onValueChange={value => {
                          const selected = resourceData?.find(
                            item => item?.value === value,
                          );
                          setState({...state, resourceType: selected});
                        }}
                        value={resourceType?.value}
                        renderValue={value => {
                          const selected = resourceData?.find(
                            item => item?.value === value,
                          );
                          return selected?.label || value;
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.nextContainer}>
              <button
                disabled={!isValid}
                className={styles.button}
                style={{
                  backgroundColor: isValid
                    ? 'var(--background)'
                    : 'var(--gray)',
                }}
                onClick={handleSubmitForm}>
                <div className={styles.buttonTitle}>Next</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawStaking;
