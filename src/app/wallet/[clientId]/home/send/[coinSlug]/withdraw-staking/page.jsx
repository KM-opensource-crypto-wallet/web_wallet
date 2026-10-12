'use client';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import React, {useState, useMemo} from 'react';
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
  isEVMChain,
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
import CoinIcon from 'components/CoinIcon';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon} from 'components/Home/HomeIcons';
import SelectInput from 'components/SelectInput';
import {setExchangeSuccess} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';

const disableTextInputChain = ['solana'];

const isDisableTextInput = chain_name =>
  disableTextInputChain.includes(chain_name);

const WithdrawStaking = () => {
  const router = useRouter();
  const routes = useAppRoutes();
  const routeData = useSelector(getRouteStateData);
  const currentRouteData = routeData?.withdrawStaking;
  const selectedStake = currentRouteData?.selectedStake;
  const isWithdrawStaking = currentRouteData?.isWithdrawStaking;
  const isDeactivateStaking = currentRouteData?.isDeactivateStaking;
  const isStakingRewards = currentRouteData?.isStakingRewards;
  const hideResource = currentRouteData?.hideResource;
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

  const isEVMStaking =
    isDeactivateStaking && isEVMChain(currentCoin?.chain_name);

  const coinStaking = currentCoin?.staking;
  const currencyRate = currentCoin?.currencyRate;
  const stakingProviderList = useMemo(() => {
    if (!isEVMStaking) {
      return [];
    }
    const staking = Array.isArray(coinStaking) ? coinStaking : [];
    return staking.map(item => ({
      label: item?.validatorInfo?.name,
      value: item?.validatorInfo?.name,
      stakedAmount: item?.stakedAmount,
      fiatAmount: multiplyBNWithFixed(item?.stakedAmount, currencyRate, 2),
    }));
  }, [isEVMStaking, coinStaking, currencyRate]);

  const [selectedProvider] = useState(
    stakingProviderList.find(
      p =>
        p.value === selectedStake?.providerName ||
        p.value === selectedStake?.validatorInfo?.name,
    ) ||
      stakingProviderList[0] ||
      null,
  );

  const [isMaxCheckbox, setIsMaxCheckbox] = useState(true);

  const [state, setState] = useState({
    resourceType:
      isResourceSupport && isDeactivateStaking ? resourceData?.[1] : null,
    amount: selectedStake?.stakedAmount || selectedStake?.amount || '0',
    currencyAmount: selectedStake?.fiatAmount || '0',
    errors: {},
  });
  const {amount, currencyAmount, errors, resourceType} = state;

  const availableAmount = useMemo(() => {
    if (isEVMStaking) {
      return selectedProvider?.stakedAmount || '0';
    }
    return selectedStake?.amount?.toString()
      ? selectedStake?.amount?.toString()
      : state?.resourceType?.value === 'ENERGY'
        ? currentCoin?.energyBalance
        : currentCoin?.bandwidthBalance;
  }, [
    isEVMStaking,
    selectedProvider?.stakedAmount,
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
    isDisableTextInput(currentCoin?.chain_name) ||
    !isDeactivateStaking ||
    (isEVMStaking && isMaxCheckbox);

  const handleMaxCheckboxToggle = value => {
    setIsMaxCheckbox(value);
    if (value) {
      setState(prev => ({
        ...prev,
        amount: availableAmount,
        currencyAmount: availableAmountCurrency,
        errors: {},
      }));
    }
  };

  const dispatch = useDispatch();

  const title = isWithdrawStaking
    ? 'Withdraw Staking'
    : isDeactivateStaking
      ? 'Deactivate Staking'
      : isStakingRewards
        ? 'Claim Staking Rewards'
        : 'Withdraw Staking';

  const handleSubmitForm = async () => {
    const localErrors =
      isEVMStaking && isMaxCheckbox ? {} : checkError(amount, currencyAmount);
    if (Object.keys(localErrors).length === 0) {
      const stakingProviderName = isEVMStaking
        ? selectedProvider?.value || selectedStake?.validatorInfo?.name
        : selectedStake?.providerName || selectedStake?.validatorInfo?.name;
      dispatch(
        setCurrentTransferData({
          validatorPubKey: selectedStake?.validator_address,
          stakingAddress: selectedStake?.staking_address,
          validatorName: selectedStake?.validatorInfo?.name,
          stakingProviderName,
          currentCoin,
          amount: validateBigNumberStr(amount),
          isStakingRewards: isStakingRewards,
          resourceType: resourceType?.value,
          isMaxCheckbox: isEVMStaking && isMaxCheckbox,
        }),
      );
      dispatch(
        calculateEstimateFee({
          isFetchNonce: true,
          fromAddress: currentCoin?.address,
          contractAddress:
            selectedStake?.validator_address || currentCoin?.contractAddress,
          amount: validateBigNumberStr(amount),
          tokenDecimals: currentCoin?.decimal,
          validatorPubKey: selectedStake?.validator_address,
          stakingAddress: selectedStake?.staking_address,
          isWithdrawStaking: isWithdrawStaking,
          isDeactivateStaking: isDeactivateStaking,
          isStakingRewards: isStakingRewards,
          resourceType: resourceType?.value,
          stakingProviderName,
          isMaxCheckbox: isEVMStaking && isMaxCheckbox,
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
      router.push(routes.coin.confirmStaking());
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
  const isValid =
    (isEVMStaking && isMaxCheckbox) ||
    (validateNumber(amount) && amountBN.lte(availableAmountBN));

  const symbol = currentCoin?.symbol?.toUpperCase() ?? '';
  const amountError = errors.amount || errors.currencyAmount;
  const setMax = () => {
    setState({
      ...state,
      amount: availableAmount,
      currencyAmount: availableAmountCurrency,
    });
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
              onClick={() => handleMaxCheckboxToggle(!isMaxCheckbox)}>
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
