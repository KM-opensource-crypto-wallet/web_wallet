'use client';
import React, {useCallback, useRef, useState} from 'react';
import {Formik} from 'formik';
import styles from './CryptoProviders.module.css';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {getUserCoinsOptions} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  getBuyCryptoUrl,
  getIPAddress,
} from 'dok-wallet-blockchain-networks/service/dokApi';
import GoBackButton from 'components/GoBackButton';
import Image from 'next/image';
import {
  validateNumber,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';

import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import SelectInputExchange from 'components/SelectInputExchange';
import {amountValidation} from 'utils/validationSchema';
import SelectInput from 'components/SelectInput';
import OutlinedInput from '@mui/material/OutlinedInput';
import {toast} from 'react-toastify';
const copyIcon = require(`assets/images/icons`).default;
import {currencySymbol} from 'data/currency';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

import {
  getCryptoProviders,
  getCryptoProvidersLoading,
} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProvidersSelectors';
import {
  debounceFetchBuyCryptoQuote,
  fetchBuyCryptoQuote,
  setCryptoProviderLoading,
} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProviderSlice';
import Loading from 'components/Loading';
import ModalAddCoins from 'components/ModalAddCoins';
import {popupCenter} from 'utils/common';
import {getIsBuyCryptoInNewTab} from 'src/whitelabel/whiteLabelInfo';
import ModalRedirect from 'components/ModalRedirect';

const currencyPicker = [
  {
    label: '$ USD',
    value: 'USD',
  },
  {
    label: '€ EURO',
    value: 'EUR',
  },
];

const CryptoProviders = () => {
  const localCurrency = useSelector(getLocalCurrency);
  const coinOptions = useSelector(getUserCoinsOptions, shallowEqual);
  const cryptoProviders = useSelector(getCryptoProviders);
  const isLoading = useSelector(getCryptoProvidersLoading);
  const dispatch = useDispatch();
  const formikRef = useRef();
  const [modalAddCoinsVisible, setModalAddCoinsVisible] = useState(false);
  const [modalInfoVisible, setModalInfoVisible] = useState(false);
  const [buyCryptoUrl, setBuyCryptoUrl] = useState(null);
  const selectedProviderRef = useRef(null);

  const launchUrl = useCallback(async url => {
    if (getIsBuyCryptoInNewTab()) {
      setModalInfoVisible(true);
      setBuyCryptoUrl(url);
    } else {
      popupCenter({url});
    }
  }, []);

  const handleNewTabClose = useCallback(() => {
    setBuyCryptoUrl(null);
    setModalInfoVisible(false);
  }, []);

  const handleNewTabLaunch = useCallback(
    url => {
      window.open(buyCryptoUrl, '_blank');
      handleNewTabClose();
    },
    [handleNewTabClose, buyCryptoUrl],
  );

  const onPressItem = useCallback(
    async item => {
      try {
        const selectedCoin = formikRef.current?.values?.selectedCoin?.options;
        const amount = formikRef.current?.values?.amount;
        const fiatCurrency = formikRef.current?.values?.fiatCurrency;
        if (!selectedCoin) {
          formikRef?.current?.setFieldError('selectedCoin');
          formikRef?.current?.setFieldTouched('selectedCoin', true);
          return;
        }
        if (isNaN(Number(amount)) || !Number(amount)) {
          formikRef?.current?.setFieldError('amount');
          formikRef?.current?.setFieldTouched('amount', true);
          return;
        }
        let ipAddress = null;
        if (item?.provider_name === 'simplex') {
          ipAddress = await getIPAddress();
        }
        const url = item?.extraData?.url;
        selectedProviderRef.current = item;
        if (url) {
          launchUrl(url);
        } else {
          const resp = await getBuyCryptoUrl({
            ...item,
            selectedCoin,
            fiatCurrency,
            amount,
            ipAddress,
            appVersion: 'web',
            from_device: 'web',
          });
          launchUrl(resp?.data);
        }
      } catch (e) {
        toast.error('Something went wrong');
        console.error('Error in press item', e);
      }
    },
    [launchUrl],
  );

  const onSubmit = useCallback(
    async (values, isDebounce) => {
      const chainDetails = values?.selectedCoin?.options;
      if (!chainDetails || !values.amount || values?.amount === '0') {
        return;
      }
      const payload = {
        fiatCurrency: values?.fiatCurrency,
        amount: validateNumber(values?.amount) || '0',
        chain_name: chainDetails?.chain_name,
        type: chainDetails?.type,
        symbol: chainDetails?.symbol,
        walletAddress: chainDetails?.walletAddress,
        from_device: 'web',
      };
      if (isDebounce) {
        dispatch(setCryptoProviderLoading(true));
        dispatch(debounceFetchBuyCryptoQuote(payload));
      } else {
        dispatch(fetchBuyCryptoQuote(payload));
      }
    },
    [dispatch],
  );

  return (
    <>
      <div className={styles.goBack}>
        <GoBackButton />
      </div>
      {modalAddCoinsVisible && (
        <ModalAddCoins
          visible={modalAddCoinsVisible}
          hideModal={setModalAddCoinsVisible}
        />
      )}
      {modalInfoVisible && (
        <ModalRedirect
          visible={modalInfoVisible}
          handleClose={handleNewTabClose}
          title={`Redirect to the ${selectedProviderRef?.current?.title || 'provider'}`}
          message={'You will be automatically redirect in'}
          onOkay={handleNewTabLaunch}
        />
      )}
      <div className={styles.container}>
        <Formik
          innerRef={formikRef}
          initialValues={{
            amount: '100',
            selectedCoin: null,
            fiatCurrency: localCurrency,
          }}
          validationSchema={amountValidation}
          onSubmit={onSubmit}>
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            setFieldValue,
          }) => (
            <div>
              <p className={styles.textStyle}>{'Select Crypto'}</p>
              <div className={styles.dropdownContainer}>
                <SelectInputExchange
                  listData={coinOptions}
                  onValueChange={event => {
                    const value = event.target.value;

                    const foundItem = coinOptions.find(
                      item => item.value === value,
                    );
                    if (foundItem) {
                      setFieldValue('selectedCoin', foundItem);
                      onSubmit({...values, selectedCoin: foundItem}, false);
                    }
                  }}
                  selectedValue={values?.selectedCoin?.value}
                  placeholder={'Select Crypto'}
                />
              </div>
              {errors.selectedCoin && touched.selectedCoin && (
                <p className={styles.textConfirm}>{errors.selectedCoin}</p>
              )}
              <div className={styles.addCoinRowView}>
                <p className={styles.text} style={{fontWeight: 700}}>
                  {'Looking for more coins?'}
                </p>
                <p
                  className={styles.highlightText}
                  onClick={e => setModalAddCoinsVisible(true)}>
                  {'Click here for add coins on selected wallet'}
                </p>
              </div>
              <div className={styles.rowView}>
                <div className={styles.fiatCurrencyPicker}>
                  <SelectInput
                    listData={currencyPicker}
                    onValueChange={value => {
                      setFieldValue('fiatCurrency', value);
                      onSubmit({...values, fiatCurrency: value}, false);
                    }}
                    value={values.fiatCurrency}
                    placeholder={'Select Network'}
                    renderValue={p => {
                      return p === 'USD' ? '$' : '€';
                    }}
                  />
                </div>
                <FormControl variant='outlined' fullWidth={true}>
                  <InputLabel
                    sx={{
                      color:
                        errors.amount && touched.amount
                          ? 'red'
                          : 'var(--borderActiveColor)',
                    }}
                    focused={false}>
                    Amount
                  </InputLabel>
                  <OutlinedInput
                    fullWidth
                    id='amount'
                    type={'text'}
                    name='amount'
                    onChange={e => {
                      const tempValues = validateNumberInInput(
                        e.target.value,
                        values?.selectedCoin?.options?.decimal,
                      );
                      setFieldValue('amount', tempValues);
                      onSubmit({...values, amount: tempValues}, true);
                    }}
                    onBlur={handleBlur('amount')}
                    value={values.amount}
                    placeholder='Enter Amount'
                    label={'Amount'}
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
                            : 'var(--font)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--sidebarIcon) !important',
                      },
                    }}
                  />
                </FormControl>
              </div>
              {errors.amount && touched.amount && (
                <p className={styles.textConfirm}>{errors.amount}</p>
              )}
              {!!values?.selectedCoin?.options?.walletAddress && (
                <div className={styles.addressView}>
                  <div className={styles.rowView}>
                    <p className={styles.textStyle}>{'Wallet Address'}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          values?.selectedCoin?.options?.walletAddress || '',
                        );
                        toast.success('address copied');
                      }}>
                      <div style={{fill: 'var(--background)'}}>
                        {copyIcon.copy}
                      </div>
                    </button>
                  </div>
                  <p className={styles.address}>
                    {values?.selectedCoin?.options?.walletAddress || '' || ''}
                  </p>
                </div>
              )}
              <button
                className={styles.button}
                type='button'
                onClick={handleSubmit}>
                {'Check Best Price'}
              </button>
              <div className={styles.btnList}>
                {isLoading ? (
                  <div className={styles.flex1}>
                    <Loading />
                  </div>
                ) : (
                  cryptoProviders?.map((item, index) => (
                    <button
                      key={index}
                      className={styles.btn}
                      onClick={() => {
                        onPressItem(item);
                      }}>
                      <div className={styles.imageBox}>
                        <Image
                          src={item.src}
                          alt={item.title}
                          className={styles.image}
                          height={40}
                          width={40}
                        />
                      </div>
                      <div className={styles.btnBox}>
                        <p className={styles.btnTitle}>{item.title}</p>
                        <p className={styles.btnCoins}>
                          {item?.fromAmount &&
                          item?.toAmount &&
                          values.selectedCoin
                            ? `${currencySymbol[values.fiatCurrency]}${
                                item.fromAmount
                              } ==> ${item.toAmount} ${
                                values.selectedCoin?.options?.symbol
                              }`
                            : ''}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </Formik>
      </div>
    </>
  );
};

export default CryptoProviders;
