'use client';
import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  FormControl,
  InputAdornment,
  InputLabel,
  OutlinedInput,
} from '@mui/material';
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
  isHaveResourceTypeInCreateStakingScreen,
  isValidatorSupportCreateStakingScreen,
  multiplyBNWithFixed,
  resourcesData,
  validateBigNumberStr,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import SelectInput from 'components/SelectInput';
import ValidatorOptionItem from 'components/ValidatorOptionItem';
import {fetchValidatorByChain} from 'dok-wallet-blockchain-networks/redux/staking/stakingSlice';
import {
  getStakingLoading,
  getStakingValidatorsByChain,
} from 'dok-wallet-blockchain-networks/redux/staking/stakingSelectors';
import Loading from 'components/Loading';
import {useRouter} from 'next/navigation';
import styles from './CreateStaking.module.css';
import PageTitle from 'components/PageTitle';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {setExchangeSuccess} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';

const CreateStaking = () => {
  const router = useRouter();

  const currentCoin = useSelector(selectCurrentCoin);
  const localCurrency = useSelector(getLocalCurrency);

  const [maxAmount, setMaxAmount] = useState('0.00000');

  const availableAmount = useMemo(() => {
    const amount = currentCoin?.totalAmount || '0';
    const minBalance = currentCoin?.minimumBalance || '0';
    return new BigNumber(amount).minus(new BigNumber(minBalance)).toString();
  }, [currentCoin]);

  const availableAmountCurrency = useMemo(() => {
    return multiplyBNWithFixed(availableAmount, currentCoin?.currencyRate, 2);
  }, [availableAmount, currentCoin?.currencyRate]);
  const isLoading = useSelector(getStakingLoading);
  const validators = useSelector(getStakingValidatorsByChain, shallowEqual);

  const dispatch = useDispatch();
  const formikRef = useRef(null);
  const validatorList = useMemo(() => {
    return validators.map(item => ({
      label: item?.name,
      value: item?.validatorAddress,
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
    if (validatorList?.[0]) {
      formikRef?.current?.setFieldValue('validatorPubKey', validatorList?.[0]);
    }
  }, [validatorList]);

  useEffect(() => {
    if (new BigNumber(availableAmount).gt(new BigNumber(0))) {
      setMaxAmount(availableAmount);
    }
  }, [availableAmount]);

  useEffect(() => {
    if (isValidatorSupport) {
      dispatch(fetchValidatorByChain({chain_name: currentCoin?.chain_name}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitForm = async values => {
    dispatch(
      setCurrentTransferData({
        validatorPubKey: isValidatorSupport
          ? values?.validatorPubKey?.value
          : null,
        validatorName: isValidatorSupport
          ? values?.validatorPubKey?.label
          : null,
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
    router.push('/home/confirm-staking');
  };

  if (isLoading) {
    return <Loading />;
  }
  return (
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
      }) => (
        <div style={{flex: 1}}>
          <PageTitle title='Create Staking' />
          <div className={styles.container} style={{padding: '20px'}}>
            <div className={styles.formInput}>
              <span className={styles.title}>Amount available for staking</span>
              <div className={styles.box}>
                <span className={styles.boxTitle}>{availableAmount}</span>
                <span className={styles.boxTitle}>
                  {' ' + currentCoin?.symbol}
                </span>
              </div>
              <div className={styles.box}>
                <span className={styles.boxBalance}>
                  {currencySymbol[localCurrency] || ''}
                  {availableAmountCurrency}
                </span>
              </div>
              <div
                style={{
                  flex: 1,
                }}>
                <div className={styles.boxInput}>
                  <div className={styles.listTitle}>Staking Amount</div>
                  <div className={styles.inputView}>
                    <FormControl sx={{m: 0, width: '100%'}} variant='outlined'>
                      <InputLabel
                        sx={{
                          color:
                            errors.password && touched.password
                              ? 'red'
                              : 'var(--borderActiveColor)',
                        }}
                        focused={false}>
                        Enter amount for staking
                      </InputLabel>
                      <OutlinedInput
                        className={styles.input}
                        id='amount'
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
                        label='Enter amount for staking'
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor:
                              errors.amount && touched.amount
                                ? 'red'
                                : 'var(--sidebarIcon)',
                          },

                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor:
                              errors.amount && touched.amount
                                ? 'red'
                                : 'var(--borderActiveColor)',
                          },

                          '& .MuiInputLabel-outlined': {
                            color:
                              errors.amount && touched.amount
                                ? 'red'
                                : 'var(--sidebarIcon)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'var(--sidebarIcon) !important',
                          },
                        }}
                        endAdornment={
                          <InputAdornment position='end'>
                            <div
                              className={styles.btnMax}
                              hitSlop={{
                                top: 12,
                                left: 12,
                                right: 12,
                                bottom: 12,
                              }}
                              onClick={() => {
                                setFieldValue(
                                  'currencyAmount',
                                  availableAmountCurrency,
                                );
                                setFieldValue('amount', maxAmount + '');
                              }}>
                              <span className={styles.btnText}>Max</span>
                            </div>
                          </InputAdornment>
                        }
                      />
                    </FormControl>
                  </div>
                  {errors.amount && (
                    <span className={styles.textConfirm}>{errors.amount}</span>
                  )}
                </div>
                <div className={styles.boxInput}>
                  <div className={styles.listTitle}>Fiat Staking Amount</div>
                  <div className={styles.inputView}>
                    <FormControl sx={{m: 0, width: '100%'}} variant='outlined'>
                      <InputLabel
                        sx={{
                          color:
                            errors.password && touched.password
                              ? 'red'
                              : 'var(--borderActiveColor)',
                        }}
                        focused={false}>
                        {`Enter ${localCurrency} amount for staking`}
                      </InputLabel>
                      <OutlinedInput
                        className={styles.input}
                        id='currencyAmount'
                        name='currencyAmount'
                        onChange={event => {
                          const tempValues = validateNumberInInput(
                            event.target.value,
                            2,
                          );
                          const tempAmount = new BigNumber(tempValues)
                            .dividedBy(new BigNumber(currentCoin?.currencyRate))
                            .toFixed(Number(currentCoin?.decimal));
                          setFieldValue('currencyAmount', tempValues);
                          setFieldValue('amount', tempAmount);
                        }}
                        onBlur={handleBlur('currencyAmount')}
                        value={values.currencyAmount}
                        label={`Enter ${localCurrency} amount for staking`}
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor:
                              errors.currencyAmount && touched.currencyAmount
                                ? 'red'
                                : 'var(--sidebarIcon)',
                          },

                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor:
                              errors.currencyAmount && touched.currencyAmount
                                ? 'red'
                                : 'var(--borderActiveColor)',
                          },

                          '& .MuiInputLabel-outlined': {
                            color:
                              errors.currencyAmount && touched.currencyAmount
                                ? 'red'
                                : 'var(--sidebarIcon)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'var(--sidebarIcon) !important',
                          },
                        }}
                        endAdornment={
                          <InputAdornment position='end'>
                            <div
                              className={styles.btnMax}
                              hitSlop={{
                                top: 12,
                                left: 12,
                                right: 12,
                                bottom: 12,
                              }}
                              onClick={() => {
                                setFieldValue(
                                  'currencyAmount',
                                  availableAmountCurrency,
                                );
                                setFieldValue('amount', maxAmount + '');
                              }}>
                              <span className={styles.btnText}>Max</span>
                            </div>
                          </InputAdornment>
                        }
                      />
                    </FormControl>
                  </div>
                  {errors.currencyAmount && (
                    <span className={styles.textConfirm}>
                      {errors.currencyAmount}
                    </span>
                  )}
                </div>
                {isValidatorSupport && (
                  <div className={styles.boxInput}>
                    <div className={styles.listTitle}>Validator</div>
                    <div className={styles.addressView}>
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

                {isResourceSupport && resourceData?.length && (
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
                onClick={handleSubmit}>
                <span className={styles.buttonTitle}>Next</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Formik>
  );
};

export default CreateStaking;
