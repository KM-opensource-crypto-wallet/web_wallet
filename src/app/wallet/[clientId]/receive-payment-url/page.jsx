'use client';
import styles from './ReceivePaymentUrl.module.css';
import React, {useCallback, useRef} from 'react';
import {useParams} from 'next/navigation';
import SelectInputExchange from 'components/SelectInputExchange';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {getUserCoinsOptions} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {Formik} from 'formik';
import {
  setPaymentUrlAmount,
  setPaymentUrlCoin,
  setPaymentUrlCurrencyAmount,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import {
  getLocalCurrency,
  getPaymentUrlAmount,
  getPaymentUrlCoin,
  getPaymentUrlCurrencyAmount,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import s from '../home/send/receive-funds/RecieveFunds.module.css';
import CopyIcon from '@mui/icons-material/FileCopyOutlined';
import {getDesktopWalletUrl} from 'whitelabel/whiteLabelInfo';
import {
  multiplyBNWithFixed,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import BigNumber from 'bignumber.js';

const ReceivePaymentUrl = () => {
  const coinOptions = useSelector(getUserCoinsOptions, shallowEqual);
  const paymentUrlCoin = useSelector(getPaymentUrlCoin);
  const paymentUrlAmount = useSelector(getPaymentUrlAmount);
  const paymentUrlCurrencyAmount = useSelector(getPaymentUrlCurrencyAmount);
  const {clientId: currentWalletClientId} = useParams();
  const dispatch = useDispatch();
  const formikRef = useRef();
  const localCurrency = useSelector(getLocalCurrency);

  const onChangeCryptoCoin = useCallback(
    event => {
      const value = event.target.value;

      const foundItem = coinOptions.find(item => item.value === value);
      if (foundItem) {
        dispatch(setPaymentUrlCoin(foundItem));
        formikRef?.current?.setFieldValue('coin', foundItem);
      }
    },
    [coinOptions, dispatch],
  );

  return (
    <div className={styles.container}>
      <Formik
        enableReinitialize={true}
        initialValues={{
          coin: paymentUrlCoin,
          amount: paymentUrlAmount || '',
          currencyAmount: paymentUrlCurrencyAmount || '',
        }}
        innerRef={formikRef}
        onSubmit={() => {}}>
        {({handleBlur, values, errors, setFieldValue}) => {
          const url = `${getDesktopWalletUrl()}/wallet/${currentWalletClientId}/home/send/send-funds?address=${
            values?.coin?.options?.walletAddress
          }&amount=${values?.amount}&currency=${
            values?.coin?.options?.chain_name
          }:${values?.coin?.options?.symbol}`;
          return (
            <>
              <p className={styles.listTitle}>{'Select Crypto'}</p>
              <div className={styles.dropdownContainer}>
                <SelectInputExchange
                  listData={coinOptions}
                  onValueChange={onChangeCryptoCoin}
                  selectedValue={values.coin.value}
                  placeholder={'Select Crypto'}
                />
              </div>
              <div className={styles.boxInput}>
                <p className={styles.listTitle}>Amount</p>
                <input
                  className={styles.input}
                  placeholder='Enter amount of Crypto to send'
                  style={{
                    borderColor: errors.amount ? 'red' : 'var(--gray)',
                  }}
                  name='amount'
                  onChange={e => {
                    const tempValues = validateNumberInInput(
                      e.target.value,
                      values?.coin?.options?.decimal,
                    );
                    setFieldValue('amount', tempValues);
                    dispatch(setPaymentUrlAmount(tempValues));
                    const tempAmount = multiplyBNWithFixed(
                      tempValues,
                      values?.coin?.options?.currencyRate,
                      2,
                    );
                    setFieldValue('amount', tempValues);
                    setFieldValue('currencyAmount', tempAmount);
                    dispatch(setPaymentUrlCurrencyAmount(tempAmount));
                  }}
                  onBlur={handleBlur('amount')}
                  value={values.amount}
                  type='number'
                />
                {errors.amount && (
                  <p className={s.textConfirm}>{errors.amount}</p>
                )}
              </div>
              <div className={styles.boxInput}>
                <p className={styles.listTitle}>Currency Amount</p>
                <input
                  className={styles.input}
                  placeholder={`Enter ${localCurrency} amount of Crypto to send`}
                  style={{
                    borderColor: errors.currencyAmount ? 'red' : 'var(--gray)',
                  }}
                  name='amount'
                  onChange={e => {
                    const tempValues = validateNumberInInput(e.target.value, 2);
                    setFieldValue('currencyAmount', tempValues);
                    dispatch(setPaymentUrlCurrencyAmount(tempValues));
                    console.log('valoues', values?.coin);
                    const tempAmount = new BigNumber(tempValues)
                      .dividedBy(
                        new BigNumber(values?.coin?.options?.currencyRate),
                      )
                      .toFixed(Number(values?.coin?.options?.decimal));
                    dispatch(setPaymentUrlAmount(tempAmount));
                    setFieldValue('amount', tempAmount);
                  }}
                  onBlur={handleBlur('currencyAmount')}
                  value={values.currencyAmount}
                  type='number'
                />
                {errors.currencyAmount && (
                  <p className={s.textConfirm}>{errors.currencyAmount}</p>
                )}
              </div>
              {values?.amount && values?.coin?.options?.chain_name && (
                <div className={styles.rowView}>
                  <div className={styles.flexView}>
                    <p className={styles.url}>{url}</p>
                  </div>
                  <button
                    // variant="contained"
                    className={s.copyButton}
                    // color="primary"
                    // startIcon={<CopyIcon />}
                    onClick={() => navigator.clipboard.writeText(url)}>
                    <CopyIcon />
                    <span>Copy</span>
                  </button>
                </div>
              )}
            </>
          );
        }}
      </Formik>
    </div>
  );
};

export default ReceivePaymentUrl;
