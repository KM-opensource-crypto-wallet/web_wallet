'use client';

import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {Formik} from 'formik';
import {useSelector, useDispatch} from 'react-redux';
import {validationSchemaSendFunds} from 'utils/validationSchema';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import BigNumber from 'bignumber.js';
import {
  calculateEstimateFee,
  setCurrentTransferData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {currencySymbol} from 'data/currency';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {useSearchParams} from 'next/navigation';
import {useRouter} from 'next/navigation';
import ModalSend from 'components/ModalSend';
import {searchCoinFromCurrency} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';
import {
  isNameSupportChain,
  isMemoSupportChain,
  multiplyBNWithFixed,
  validateBigNumberStr,
  validateNumberInInput,
  isBitcoinChain,
  isEip7702SupportedChain,
} from 'dok-wallet-blockchain-networks/helper';
import PageTitle from 'components/PageTitle';
import s from './SendFunds.module.css';
import {showToast} from 'src/utils/toast';
import {setExchangeSuccess} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {getTransferData} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSelector';
import {v4} from 'uuid';
import {addBatchTransaction} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSlice';

const SendFunds = () => {
  const currentCoin = useSelector(selectCurrentCoin);
  const searchParams = useSearchParams();
  const qrAddress = searchParams.get('address');
  const qrAmount = searchParams.get('amount');
  const localCurrency = useSelector(getLocalCurrency);
  const transferData = useSelector(getTransferData);
  const isBitcoin = isBitcoinChain(currentCoin?.chain_name);

  const [modal, setModal] = useState(false);
  const [maxAmount, setMaxAmount] = useState('0.00000');
  const [sendInput, setSendInput] = useState(qrAddress || '');
  const dispatch = useDispatch();
  const formikRef = useRef(null);

  const uuid = useMemo(() => {
    return v4();
  }, []);

  const availableAmount = useMemo(() => {
    const amount =
      (isBitcoin && transferData?.selectedUTXOsValue) ||
      currentCoin?.totalAmount ||
      '0';

    const minBalance = currentCoin?.minimumBalance || '0';
    return new BigNumber(amount).minus(new BigNumber(minBalance)).toString();
  }, [
    isBitcoin,
    currentCoin?.minimumBalance,
    currentCoin?.totalAmount,
    transferData?.selectedUTXOsValue,
  ]);

  const availableAmountCurrency = useMemo(() => {
    return multiplyBNWithFixed(availableAmount, currentCoin?.currencyRate, 2);
  }, [availableAmount, currentCoin?.currencyRate]);
  const isMemoSupported = useMemo(() => {
    return isMemoSupportChain(currentCoin?.chain_name);
  }, [currentCoin?.chain_name]);

  useEffect(() => {
    const currency = searchParams?.get('currency');
    if (currency) {
      dispatch(searchCoinFromCurrency({currency}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect(() => {
  //   if (qrAddress) {
  //     formikRef?.current?.setFieldValue("send", qrAddress);
  //   }
  //   if (qrAmount) {
  //     formikRef?.current?.setFieldValue("amount", qrAmount);
  //   }
  //   if (qrAddress || qrAmount) {
  //     setTimeout(() => {
  //       formikRef?.current?.setFieldTouched("send", true);
  //       formikRef?.current?.setFieldTouched("amount", true);
  //     }, 0);
  //   }
  // }, [newDate, qrAddress, qrAmount]);

  useEffect(() => {
    if (new BigNumber(availableAmount).gt(new BigNumber(0))) {
      setMaxAmount(availableAmount);
    }
  }, [availableAmount]);

  const handleSubmitForm = async values => {
    if (
      currentCoin?.chain_name === 'polkadot' ||
      currentCoin.chain_name === 'cardano'
    ) {
      const availableAmountBN = new BigNumber(availableAmount);
      const amount = new BigNumber(values.amount);
      if (
        currentCoin.chain_name === 'polkadot' &&
        availableAmountBN.minus(amount).lt(new BigNumber(1.1)) &&
        !availableAmountBN.eq(amount)
      ) {
        showToast({
          type: 'errorToast',
          title: 'Polkadot warning',
          message: 'Required minimum 1 DOT or send total amount',
        });
        return;
      }
      if (currentCoin.chain_name === 'cardano') {
        if (amount.lt(new BigNumber(1))) {
          formikRef?.current?.setFieldError(
            'amount',
            'minimum 1 ADA is required for transaction',
          );
          return;
        }
        if (
          !amount.eq(availableAmountBN) &&
          availableAmountBN.minus(amount).lt(new BigNumber(1))
        ) {
          formikRef?.current?.setFieldError(
            'amount',
            'Remaining balance is less than 1 ADA, please send max amount',
          );
          return;
        }
      }
    }
    if (new BigNumber(values.amount).gt(availableAmount)) {
      setModal(true);
      return;
    }
    const currentChain = getChain(currentCoin?.chain_name);
    const isValid = await currentChain.isValidAddress({address: values?.send});
    let validAddress = null;
    if (!isValid && isNameSupportChain(currentCoin?.chain_name)) {
      validAddress = await currentChain?.isValidName({name: values?.send});
    }
    if (isValid || validAddress) {
      dispatch(
        setCurrentTransferData({
          toAddress: validAddress || values?.send?.trim(),
          currentCoin,
          amount: validateBigNumberStr(values?.amount),
          initialAmount:
            currentCoin?.type !== 'token' &&
            validateBigNumberStr(values?.amount),
          isSendFunds: true,
          validName: validAddress ? values?.send : null,
          memo: values?.memo?.trim(),
        }),
      );
      dispatch(
        calculateEstimateFee({
          isFetchNonce: true,
          fromAddress: currentCoin?.address,
          toAddress: validAddress || values?.send?.trim(),
          amount: validateBigNumberStr(values?.amount),
          contractAddress: currentCoin?.contractAddress,
          balance: availableAmount,
          memo: values?.memo?.trim(),
          selectedUTXOs: transferData?.selectedUTXOs,
        }),
      );
      dispatch(setExchangeSuccess(false));
      dispatch(
        setRouteStateData({
          transfer: {
            fromScreen: 'SendFunds',
          },
        }),
      );
      router.push('/home/send/send-funds/transfer');
    } else {
      formikRef?.current?.setFieldError('send', 'address is not valid');
    }
  };

  const router = useRouter();

  const addToBatch = useCallback(async () => {
    const values = formikRef.current.values;
    const currentChain = getChain(currentCoin?.chain_name);
    const isValid = await currentChain.isValidAddress({address: values?.send});
    let validAddress = null;
    if (!isValid && isNameSupportChain(currentCoin?.chain_name)) {
      validAddress = await currentChain?.isValidName({name: values?.send});
    }
    if (isValid || validAddress) {
      dispatch(
        addBatchTransaction({
          transactionId: uuid,
          selectedCoin: currentCoin,
          transferData: {
            contractAddress: currentCoin?.contractAddress,
            fromAddress: currentCoin?.address,
            toAddress: values?.send,
            decimals: currentCoin?.decimal,
            amount: validateBigNumberStr(values?.amount),
            fiatAmount: values?.currencyAmount || '0',
          },
          isERC20Token: currentCoin?.type?.toLowerCase() === 'token',
          router,
        }),
      );
    } else {
      formikRef?.current?.setFieldError('send', 'address is not valid');
    }
  }, [currentCoin, dispatch, router, uuid]);

  return (
    <>
      <PageTitle title='Send Funds' />
      <div className={s.contentContainerStyle}>
        <Formik
          innerRef={formikRef}
          enableReinitialize={true}
          initialValues={{
            send: qrAddress || sendInput,
            amount: qrAmount || '',
            currencyAmount: '',
            memo: '',
          }}
          validationSchema={validationSchemaSendFunds(
            availableAmount,
            availableAmountCurrency,
          )}
          onSubmit={handleSubmitForm}>
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            isValid,
            setFieldValue,
          }) => (
            <div style={{display: 'flex', flex: 1}}>
              <div className={s.container}>
                <div className={s.formInput}>
                  <p className={s.title}>Your balance</p>
                  <div className={s.box}>
                    <p className={s.boxTitle}>{availableAmount}</p>
                    <p className={s.boxTitle}>{' ' + currentCoin?.symbol}</p>
                  </div>
                  <div className={s.box}>
                    <p className={s.boxBalance}>
                      {currencySymbol[localCurrency] || ''}
                      {availableAmountCurrency}
                    </p>
                  </div>

                  <div className={s.boxInputFull}>
                    <p className={s.listTitle}>Send to</p>
                    <input
                      className={s.input}
                      placeholder='Enter wallet adress'
                      style={{
                        borderColor: errors.send ? 'red' : 'var(--gray)',
                      }}
                      name='send'
                      onChange={handleChange('send')}
                      onBlur={handleBlur('send')}
                      value={values.send}
                      onSubmit={handleSubmit}
                    />
                    {errors.send && (
                      <p className={s.textConfirm}>{errors.send}</p>
                    )}
                  </div>

                  <div className={s.inputWrapper}>
                    {/* //////////amount//////////// */}
                    <div className={s.boxInput}>
                      <p className={s.listTitle}>Amount</p>
                      <div className={s.inputView}>
                        <input
                          className={s.input}
                          placeholder='Enter amount of Crypto to send'
                          style={{
                            borderColor: errors.amount ? 'red' : 'var(--gray)',
                          }}
                          name='amount'
                          onChange={async event => {
                            const tempValues = validateNumberInInput(
                              event.target.value,
                              currentCoin?.decimal,
                            );
                            const tempAmount = multiplyBNWithFixed(
                              tempValues,
                              currentCoin?.currencyRate,
                              2,
                            );
                            await setFieldValue('amount', tempValues);
                            await setFieldValue('currencyAmount', tempAmount);
                          }}
                          onBlur={handleBlur('amount')}
                          value={values.amount}
                          onSubmit={handleSubmit}
                          type='number'
                        />
                        <button
                          className={s.btnMax}
                          onClick={async () => {
                            await setFieldValue(
                              'currencyAmount',
                              availableAmountCurrency,
                            );
                            await setFieldValue('amount', maxAmount + '');
                          }}>
                          <p className={s.btnText}>Max</p>
                        </button>
                      </div>

                      {errors.amount && (
                        <p className={s.textConfirm}>{errors.amount}</p>
                      )}
                    </div>
                    <div className={s.boxInput}>
                      <p className={s.listTitle}>Currency Amount</p>
                      <div className={s.inputView}>
                        <input
                          className={s.input}
                          placeholder={`Enter ${localCurrency} amount of Crypto to send`}
                          style={{
                            borderColor: errors.currencyAmount
                              ? 'red'
                              : 'var(--gray)',
                          }}
                          name='currencyAmount'
                          onChange={async event => {
                            const tempValues = validateNumberInInput(
                              event.target.value,
                              2,
                            );
                            const tempAmount = new BigNumber(tempValues)
                              .dividedBy(
                                new BigNumber(currentCoin?.currencyRate),
                              )
                              .toFixed(Number(currentCoin?.decimal));
                            await setFieldValue('currencyAmount', tempValues);
                            await setFieldValue('amount', tempAmount);
                          }}
                          onBlur={handleBlur('currencyAmount')}
                          value={values.currencyAmount}
                          onSubmit={handleSubmit}
                          type='number'
                        />
                        <button
                          className={s.btnMax}
                          onClick={async () => {
                            await setFieldValue(
                              'currencyAmount',
                              availableAmountCurrency,
                            );
                            await setFieldValue('amount', maxAmount + '');
                          }}>
                          <p className={s.btnText}>Max</p>
                        </button>
                      </div>

                      {errors.currencyAmount && (
                        <p className={s.textConfirm}>{errors.currencyAmount}</p>
                      )}
                    </div>
                    {isMemoSupported && (
                      <div className={s.boxInputFull}>
                        <p className={s.listTitle}>Memo</p>
                        <input
                          className={s.input}
                          placeholder='Enter memo'
                          style={{
                            borderColor: errors.memo ? 'red' : 'var(--gray)',
                          }}
                          name='send'
                          onChange={handleChange('memo')}
                          onBlur={handleBlur('memo')}
                          value={values.memo}
                        />
                        <p className={s.infoText}>
                          {
                            'Memo or Tag is optional, It is only required when recipient needed.'
                          }
                        </p>
                        {errors.memo && (
                          <p className={s.textConfirm}>{errors.memo}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {isEip7702SupportedChain(currentCoin?.chain_name) && (
                  <button
                    disabled={!isValid}
                    className={s.button}
                    style={{
                      backgroundColor: isValid
                        ? 'var(--background)'
                        : 'var(--gray)',
                    }}
                    onClick={addToBatch}>
                    <p className={s.buttonTitle}>Add to Batch</p>
                  </button>
                )}
                <button
                  disabled={!isValid}
                  className={s.button}
                  style={{
                    backgroundColor: isValid
                      ? 'var(--background)'
                      : 'var(--gray)',
                  }}
                  onClick={handleSubmit}>
                  <p className={s.buttonTitle}>Next</p>
                </button>
              </div>
            </div>
          )}
        </Formik>

        <ModalSend
          visible={modal}
          hideModal={setModal}
          currentCoin={currentCoin}
        />
      </div>
    </>
  );
};

export default SendFunds;
