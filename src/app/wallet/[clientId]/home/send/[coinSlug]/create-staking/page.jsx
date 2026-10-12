'use client';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {Formik} from 'formik';
import {shallowEqual, useSelector} from 'react-redux';
import {getValidationSchemaForCreateStaking} from 'utils/validationSchema';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {useDispatch} from 'react-redux';
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
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import SelectInput from 'components/SelectInput';
import ValidatorOptionItem from 'components/ValidatorOptionItem';
import {
  fetchValidatorByChain,
  fetchStakingAllowance,
  executeApprove,
} from 'dok-wallet-blockchain-networks/redux/staking/stakingSlice';
import {
  getStakingLoading,
  getStakingValidatorsByChain,
  getStakingAllowanceLoading,
} from 'dok-wallet-blockchain-networks/redux/staking/stakingSelectors';
import ModalAllowanceInfo from 'components/ModalAllowanceInfo';
import Loading from 'components/Loading';
import {useRouter} from 'next/navigation';
import styles from './CreateStaking.module.css';
import CoinIcon from 'components/CoinIcon';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon} from 'components/Home/HomeIcons';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {setExchangeSuccess} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';

const CreateStaking = () => {
  const router = useRouter();
  const routes = useAppRoutes();

  const currentCoin = useSelector(selectCurrentCoin);
  const localCurrency = useSelector(getLocalCurrency);

  const [maxAmount, setMaxAmount] = useState('0.00000');
  const [allowanceModalVisible, setAllowanceModalVisible] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [pendingStakingProviderName, setPendingStakingProviderName] =
    useState(null);
  const [pendingAmount, setPendingAmount] = useState(null);
  const pendingFormValuesRef = useRef(null);

  const isEVMStaking = useMemo(
    () =>
      isEVMChain(currentCoin?.chain_name) &&
      !!currentCoin?.contractAddress &&
      !['tron', 'solana'].includes(currentCoin?.chain_name),
    [currentCoin?.chain_name, currentCoin?.contractAddress],
  );

  const availableAmount = useMemo(() => {
    const amount = currentCoin?.totalAmount || '0';
    const minBalance = currentCoin?.minimumBalance || '0';
    return new BigNumber(amount).minus(new BigNumber(minBalance)).toString();
  }, [currentCoin]);

  const availableAmountCurrency = useMemo(() => {
    return multiplyBNWithFixed(availableAmount, currentCoin?.currencyRate, 2);
  }, [availableAmount, currentCoin?.currencyRate]);
  const isLoading = useSelector(getStakingLoading);
  const allowanceLoading = useSelector(getStakingAllowanceLoading);
  const validators = useSelector(getStakingValidatorsByChain, shallowEqual);

  const dispatch = useDispatch();
  const formikRef = useRef(null);
  const defaultValidatorSetRef = useRef(false);
  const validatorList = useMemo(() => {
    return validators.map(item => ({
      label: item?.name,
      value: item?.validatorAddress || item?.name,
      options: item,
      option: <ValidatorOptionItem item={item} currentCoin={currentCoin} />,
    }));
  }, [validators, currentCoin]);

  const isValidatorSupport = useMemo(() => {
    return isValidatorSupportCreateStakingScreen(currentCoin?.chain_name);
  }, [currentCoin?.chain_name]);

  const isResourceSupport = useMemo(() => {
    return isHaveResourceTypeInCreateStakingScreen(currentCoin?.chain_name);
  }, [currentCoin?.chain_name]);

  const resourceData = useMemo(() => {
    return isResourceSupport ? resourcesData[currentCoin?.chain_name] : null;
  }, [isResourceSupport, currentCoin?.chain_name]);

  useEffect(() => {
    if (validatorList?.[0] && !defaultValidatorSetRef.current) {
      defaultValidatorSetRef.current = true;
      formikRef?.current?.setFieldValue('validatorPubKey', validatorList?.[0]);
    }
  }, [validatorList]);

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      if (new BigNumber(availableAmount).gt(new BigNumber(0))) {
        setMaxAmount(availableAmount);
      }
    })();
  }, [availableAmount]);

  useEffect(() => {
    if (isValidatorSupport) {
      dispatch(fetchValidatorByChain({chain_name: currentCoin?.chain_name}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToTransfer = useCallback(
    (values, allowanceType) => {
      dispatch(
        setCurrentTransferData({
          validatorPubKey: isValidatorSupport
            ? values?.validatorPubKey?.value
            : null,
          validatorName: isValidatorSupport
            ? values?.validatorPubKey?.label
            : null,
          stakingProviderName: values?.validatorPubKey?.label,
          allowanceType: allowanceType || 'manual',
          currentCoin,
          amount: validateBigNumberStr(values?.amount),
          isSendFunds: false,
          resourceType: isResourceSupport ? values?.resourceType?.value : null,
        }),
      );
      dispatch(
        calculateEstimateFee({
          isFetchNonce: true,
          fromAddress: currentCoin?.address,
          amount: validateBigNumberStr(values?.amount),
          validatorPubKey: isValidatorSupport
            ? values?.validatorPubKey?.value
            : null,
          balance: availableAmount,
          isCreateStaking: true,
          resourceType: isResourceSupport ? values?.resourceType?.value : null,
          stakingProviderName: values?.validatorPubKey?.label,
        }),
      );
      dispatch(setExchangeSuccess(false));

      dispatch(
        setRouteStateData({
          transfer: {
            fromScreen: 'Staking',
            isCreateStaking: true,
          },
        }),
      );
      router.push(routes.coin.confirmStaking());
    },
    [
      dispatch,
      isValidatorSupport,
      isResourceSupport,
      currentCoin,
      availableAmount,
      router,
      routes,
    ],
  );

  const handleSubmitForm = useCallback(
    async values => {
      if (isEVMStaking) {
        pendingFormValuesRef.current = values;
        setPendingStakingProviderName(values?.validatorPubKey?.label);
        setPendingAmount(values?.amount);
        try {
          const result = await dispatch(
            fetchStakingAllowance({
              stakingProviderName: values?.validatorPubKey?.label,
              amount: values?.amount,
            }),
          ).unwrap();
          if (result?.isApproved) {
            pendingFormValuesRef.current = null;
            navigateToTransfer(values, 'manual');
          } else {
            setAllowanceModalVisible(true);
          }
        } catch (e) {
          console.warn('[CreateStaking] allowance fetch failed:', e?.message);
        }
        return;
      }
      navigateToTransfer(values);
    },
    [dispatch, isEVMStaking, navigateToTransfer],
  );

  const onAllowanceContinue = useCallback(
    async ({
      isFetchNonce,
      type: allowanceType,
      gasFee,
      maxPriorityFeePerGas,
      stakingProviderName,
      amount,
      nonce,
      feesType,
      estimateGas,
      customGasPrice,
    }) => {
      if (!pendingFormValuesRef.current) {
        return;
      }
      const formValues = pendingFormValuesRef.current;
      setApproveLoading(true);
      let tx_hash;
      try {
        const result = await dispatch(
          executeApprove({
            isFetchNonce,
            allowanceType,
            gasFee,
            maxPriorityFeePerGas,
            stakingProviderName:
              stakingProviderName || formValues?.validatorPubKey?.label,
            amount,
            nonce,
            feesType,
            estimateGas,
            customGasPrice,
          }),
        ).unwrap();
        tx_hash = result?.tx_hash;
      } catch (e) {
        setApproveLoading(false);
        setAllowanceModalVisible(false);
        console.warn('[CreateStaking] allowance action failed:', e?.message);
        return;
      }
      setApproveLoading(false);
      setAllowanceModalVisible(false);
      if (!tx_hash) {
        return;
      }
      pendingFormValuesRef.current = null;
      navigateToTransfer(formValues, allowanceType);
    },
    [dispatch, navigateToTransfer],
  );

  const symbol = currentCoin?.symbol?.toUpperCase() ?? '';

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
        <h1 className={styles.title}>Stake {symbol}</h1>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>
      <div className={styles.column}>
        {isLoading ? (
          <div className={styles.loading}>
            <Loading />
          </div>
        ) : (
          <Formik
            innerRef={formikRef}
            enableReinitialize={true}
            initialValues={{
              amount: '',
              currencyAmount: '',
              validatorPubKey: null,
              resourceType: isResourceSupport ? resourceData[1] : null,
            }}
            validationSchema={getValidationSchemaForCreateStaking(
              currentCoin?.chain_name,
              availableAmount,
            )}
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
              const setMax = () => {
                setFieldValue('currencyAmount', availableAmountCurrency);
                setFieldValue('amount', maxAmount + '');
              };
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
                          onClick={setMax}>
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
                              setFieldValue('currencyAmount', tempAmount);
                              setFieldValue('amount', tempValues);
                            }}
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
                            onChange={event => {
                              const tempValues = validateNumberInInput(
                                event.target.value,
                                2,
                              );
                              const tempAmount = new BigNumber(tempValues)
                                .dividedBy(
                                  new BigNumber(currentCoin?.currencyRate),
                                )
                                .toFixed(Number(currentCoin?.decimal));
                              setFieldValue('currencyAmount', tempValues);
                              setFieldValue('amount', tempAmount);
                            }}
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
                            onValueChange={value => {
                              const selected = validatorList?.find(
                                item => item?.value === value,
                              );
                              setFieldValue('validatorPubKey', selected);
                            }}
                            value={values.validatorPubKey?.value}
                            renderValue={value => {
                              const selected = validatorList?.find(
                                item => item?.value === value,
                              );
                              return selected?.label || value;
                            }}
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
                            onValueChange={value => {
                              const selected = resourceData?.find(
                                item => item?.value === value,
                              );
                              setFieldValue('resourceType', selected);
                            }}
                            value={values.resourceType?.value}
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
        onClose={() => {
          setAllowanceModalVisible(false);
          pendingFormValuesRef.current = null;
        }}
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
    </main>
  );
};

export default CreateStaking;
