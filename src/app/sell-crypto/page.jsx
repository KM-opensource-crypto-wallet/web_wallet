'use client';
import {FormControl, InputLabel, OutlinedInput} from '@mui/material';
import styles from './SellCrypto.module.css';
import {
  getSellCryptoError,
  getSellCryptoLoading,
  getSellCryptoProviders,
} from 'dok-wallet-blockchain-networks/redux/sellCrypto/sellCryptoSelectors';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  getUserCoinsOptions,
  selectCurrentWalletClientId,
  selectVisibleWallets,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {Formik} from 'formik';
import React, {useCallback, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import {shallowEqual, useDispatch} from 'react-redux';
import ModalAddCoins from 'src/components/ModalAddCoins';
import SelectInput from 'src/components/SelectInput';
import SelectInputExchange from 'src/components/SelectInputExchange';
import {sellCryptoValidation} from 'src/utils/validationSchema';
import Loading from 'src/components/Loading';
import Image from 'next/image';
import {
  validateNumber,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import {
  debounceFetchSellCryptoQuote,
  fetchSellCryptoPaymentDetails,
  fetchSellCryptoQuote,
  fetchSellCryptoUrl,
  initiateSellCryptoTransfer,
  setRequestDetails,
  setSellCryptoLoading,
  setTransferDetails,
} from 'dok-wallet-blockchain-networks/redux/sellCrypto/sellCryptoSlice';
import {currencySymbol} from 'src/data/currency';
import {toast} from 'react-toastify';
import {setCurrentTransferSuccess} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {popupCenter} from 'src/utils/common';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {useRouter} from 'next/navigation';
import ModalLoad from 'src/components/ModalLoad';

const copyIcon = require(`assets/images/icons`).default;

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

const SellCrypto = () => {
  const localCurrency = useSelector(getLocalCurrency);
  const coinOptions = useSelector(getUserCoinsOptions, shallowEqual);
  const cryptoProviders = useSelector(getSellCryptoProviders);
  const isLoading = useSelector(getSellCryptoLoading);
  const dispatch = useDispatch();
  const [modalAddCoinsVisible, setModalAddCoinsVisible] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageLoadingTitle, setPageLoadingTitle] = useState('Loading...');

  const allWallets = useSelector(selectVisibleWallets);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);

  const sellCryptoError = useSelector(getSellCryptoError);

  const formikRef = useRef();

  const router = useRouter();

  const handlePageLoading = useCallback((title = 'Please wait...') => {
    setPageLoading(true);
    setPageLoadingTitle(title);
  }, []);

  const handlePageLoadingClose = useCallback(() => {
    setPageLoading(false);
    setPageLoadingTitle('Loading...');
  }, []);

  const handleWebViewClose = useCallback(
    async (success, data) => {
      handlePageLoadingClose();
      if (success) {
        handlePageLoading('Fetching payment details...');
        if (data != null) {
          dispatch(setCurrentTransferSuccess(false));
          handlePageLoadingClose();
          dispatch(
            setTransferDetails({
              depositAmount: data.baseCurrencyAmount,
              depositAddress: data.depositWalletAddress,
              memo: data?.depositWalletAddressTag,
            }),
          );
          dispatch(initiateSellCryptoTransfer());
          dispatch(
            setRouteStateData({
              transfer: {
                fromScreen: 'SellCrypto',
              },
            }),
          );
          router.push('/sell-crypto/confirm');
        } else {
          await dispatch(fetchSellCryptoPaymentDetails());
          handlePageLoadingClose();
          if (sellCryptoError == null) {
            dispatch(setCurrentTransferSuccess(false));
            dispatch(initiateSellCryptoTransfer());
            dispatch(
              setRouteStateData({
                transfer: {
                  fromScreen: 'SellCrypto',
                },
              }),
            );
            router.push('/sell-crypto/confirm');
          } else {
            toast.error('Some error occurred. Please retry');
          }
        }
      }
    },
    [
      dispatch,
      sellCryptoError,
      router,
      handlePageLoadingClose,
      handlePageLoading,
    ],
  );

  const launchWebView = useCallback(
    async url => {
      handlePageLoading('Please complete the transaction in the popup window');
      popupCenter({url, callback: handleWebViewClose});
    },
    [handleWebViewClose, handlePageLoading],
  );

  const getCoinDetails = useCallback(
    coinDetails => {
      let selectedCoinDetails = {};
      let selectedWalletDetails = {};
      let possibleCoinDetails = [];
      for (let i = 0; i < allWallets.length; i++) {
        const tempWallet = allWallets[i];
        const tempCoinDetails = tempWallet?.coins.find(
          item =>
            item?.symbol?.toUpperCase() ===
              coinDetails?.options?.symbol?.toUpperCase() &&
            item?.chain_name === coinDetails?.options?.chain_name,
        );
        if (tempCoinDetails?.chain_symbol === 'BNB') {
          tempCoinDetails.chain_symbol = 'BSC';
        }
        if (tempWallet?.clientId === currentWalletClientId && tempCoinDetails) {
          selectedCoinDetails = tempCoinDetails;
          selectedWalletDetails = tempWallet;
        }
        if (tempCoinDetails) {
          const tempAddress = tempCoinDetails?.address;
          const optionPayload = {
            label: `${tempWallet?.walletName}: ${tempAddress}`,
            value: tempAddress,
            options: {
              coinDetails: tempCoinDetails,
              walletDetails: selectedWalletDetails,
            },
          };
          possibleCoinDetails.push(optionPayload);
        }
      }
      return {selectedCoinDetails, possibleCoinDetails, selectedWalletDetails};
    },
    [allWallets, currentWalletClientId],
  );

  const onPressItem = useCallback(
    async item => {
      try {
        const chainDetails = formikRef.current?.values?.selectedCoin?.options;
        if (!chainDetails) {
          formikRef?.current?.setFieldError('selectedCoin');
          formikRef?.current?.setFieldTouched('selectedCoin', true);
          return;
        }
        const payload = {
          providerName: item?.provider_name,
          selectedCoin: {
            symbol: chainDetails?.symbol,
            chain_name: chainDetails?.chain_name,
          },
          amount: validateNumber(formikRef?.current?.values?.amount) || '0',
          fiatCurrency: formikRef?.current?.values?.fiatCurrency,
          quoteId: item?.extraData?.id,
        };
        if (item?.extraData?.url) {
          launchWebView(item?.extraData?.url);
        } else {
          handlePageLoading();
          const resp = await dispatch(fetchSellCryptoUrl(payload));
          const respUrl = resp?.payload;
          const splitArr = respUrl?.split('requestId=');
          let requestId = '';
          if (splitArr?.length !== 2) {
            requestId = '';
            // return;
          } else {
            requestId = splitArr[1];
          }

          const coinDetails = getCoinDetails(
            formikRef?.current?.values?.selectedCoin,
          );

          dispatch(
            setRequestDetails({
              requestId: requestId,
              providerName: item?.provider_name,
              providerDisplayName: item?.title,
              selectedFromAsset: coinDetails?.selectedCoinDetails,
              selectedFromWallet: coinDetails?.selectedWalletDetails,
            }),
          );

          launchWebView(respUrl);
        }
      } catch (error) {
        console.log('error', error);
      }
    },
    [dispatch, launchWebView, getCoinDetails, handlePageLoading],
  );

  const onSubmit = useCallback(
    (values, isDebounce) => {
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
        dispatch(setSellCryptoLoading(true));
        dispatch(debounceFetchSellCryptoQuote(payload));
      } else {
        dispatch(fetchSellCryptoQuote(payload));
      }
    },
    [dispatch],
  );

  return (
    <>
      {modalAddCoinsVisible && (
        <ModalAddCoins
          visible={modalAddCoinsVisible}
          hideModal={setModalAddCoinsVisible}
        />
      )}
      {pageLoading && <ModalLoad open={pageLoading} title={pageLoadingTitle} />}
      <div className={styles.container}>
        <Formik
          innerRef={formikRef}
          initialValues={{
            amount: '0.1',
            selectedCoin: null,
            fiatCurrency: localCurrency,
          }}
          validationSchema={sellCryptoValidation}
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
              <div>
                <p className={styles.textStyle}>{'Select Currency'}</p>
                <div className={styles.fiatCurrencyPicker}>
                  <SelectInput
                    listData={currencyPicker}
                    onValueChange={value => {
                      setFieldValue('fiatCurrency', value);
                      onSubmit({...values, fiatCurrency: value}, false);
                    }}
                    value={values.fiatCurrency}
                    placeholder={'Select Currency'}
                    renderValue={p => {
                      return p;
                    }}
                  />
                </div>
              </div>
              <FormControl
                variant='outlined'
                fullWidth={true}
                style={{
                  marginTop: 24,
                }}>
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
                        errors.amount && touched.amount ? 'red' : 'var(--font)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--sidebarIcon) !important',
                    },
                  }}
                />
              </FormControl>
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
              <button className={styles.button} type='submit'>
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
                            ? `${item.fromAmount} ${
                                values.selectedCoin?.options?.symbol
                              } ==> ${currencySymbol[values.fiatCurrency]}${item.toAmount} `
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

export default SellCrypto;
