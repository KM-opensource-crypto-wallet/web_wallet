'use client';
import {walletRoutes} from 'utils/routes';
import styles from './SellCrypto.module.css';
import {
  getSellCryptoError,
  getSellCryptoLoading,
  getSellCryptoProviders,
} from 'dok-wallet-blockchain-networks/redux/sellCrypto/sellCryptoSelectors';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  getUserCoinsOptions,
  selectCurrentWallet,
  selectCurrentWalletClientId,
  selectVisibleWallets,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {Formik} from 'formik';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import {shallowEqual, useDispatch} from 'react-redux';
import ModalAddCoins from 'src/components/ModalAddCoins';
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
import {useParams, useRouter} from 'next/navigation';
import ModalLoad from 'src/components/ModalLoad';
import GeneralButton from 'components/Button';
import HomeSheet from 'components/Home/HomeSheet';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/useHome';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CopyIcon,
  InfoIcon,
  PlusIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';

const CURRENCIES = ['USD', 'EUR'];

const RefreshIcon = props => (
  <svg
    width={13}
    height={13}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.4'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
    {...props}>
    <path d='M21 12a9 9 0 1 1-3-6.7' />
    <path d='M21 4v5h-5' />
  </svg>
);

const formatFiat = value =>
  Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Sell quotes: the best payout is the largest fiat amount; the others show
// how far below it they are.
const rankQuotes = providers => {
  const list = Array.isArray(providers) ? providers : [];
  const best = list.reduce((max, item) => {
    const got = Number(item?.toAmount);
    return got > max ? got : max;
  }, 0);
  return list.map((item, index) => {
    const got = Number(item?.toAmount);
    const hasQuote = got > 0;
    return {
      item,
      index,
      key: item?.provider_name || item?.title || String(index),
      hasQuote,
      got,
      isBest: hasQuote && best > 0 && got === best,
      diff: hasQuote && best > 0 && got < best ? (got - best) / best : null,
    };
  });
};

const SellCrypto = () => {
  const localCurrency = useSelector(getLocalCurrency);
  const coinOptions = useSelector(getUserCoinsOptions, shallowEqual);
  const cryptoProviders = useSelector(getSellCryptoProviders);
  const isLoading = useSelector(getSellCryptoLoading);
  const currentWallet = useSelector(selectCurrentWallet);
  const dispatch = useDispatch();
  const [modalAddCoinsVisible, setModalAddCoinsVisible] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageLoadingTitle, setPageLoadingTitle] = useState('Loading...');
  const [coinSheetOpen, setCoinSheetOpen] = useState(false);
  const [coinQuery, setCoinQuery] = useState('');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [pickedKey, setPickedKey] = useState(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const copiedTimerRef = useRef(null);

  const allWallets = useSelector(selectVisibleWallets);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);

  const sellCryptoError = useSelector(getSellCryptoError);

  useEffect(() => () => clearTimeout(copiedTimerRef.current), []);

  const copyAddress = useCallback(address => {
    navigator.clipboard.writeText(address || '');
    setAddressCopied(true);
    clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setAddressCopied(false), 1500);
  }, []);

  const quotes = useMemo(() => rankQuotes(cryptoProviders), [cryptoProviders]);
  const activeQuote =
    quotes.find(q => q.key === pickedKey) ||
    quotes.find(q => q.isBest) ||
    quotes[0] ||
    null;
  const walletName = currentWallet?.walletName || 'Wallet';

  const formikRef = useRef();

  const router = useRouter();
  const {clientId} = useParams();

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
          router.push(walletRoutes.sellCryptoConfirm(clientId));
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
            router.push(walletRoutes.sellCryptoConfirm(clientId));
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
      clientId,
      handlePageLoadingClose,
      handlePageLoading,
    ],
  );

  const launchWebView = useCallback(
    async url => {
      handlePageLoading('Please complete the transaction in the popup window');
      const cleanup = await popupCenter({url, callback: handleWebViewClose});
      if (cleanup === null) {
        toast.error('Please allow pop-ups to continue');
      }
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
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden='true' />
      <div className={styles.topBar}>
        <GeneralButton
          variant='unstyled'
          className={styles.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <GeneralButton
          variant='unstyled'
          className={styles.heading}
          aria-haspopup='dialog'
          onClick={() => setSwitcherOpen(true)}>
          <h1 className={styles.headingTitle}>Sell</h1>
          <span className={styles.headingSub}>
            <span className={styles.walletAvatar}>
              {walletName[0].toUpperCase()}
            </span>
            <span className={styles.headingSubText}>{walletName}</span>
            <ChevronDownIcon size={12} className={styles.headingChevron} />
          </span>
        </GeneralButton>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>

      <Formik
        innerRef={formikRef}
        initialValues={{
          amount: '0.1',
          selectedCoin: null,
          fiatCurrency: localCurrency,
        }}
        validationSchema={sellCryptoValidation}
        onSubmit={onSubmit}>
        {({handleBlur, values, errors, touched, setFieldValue}) => {
          const coin = values?.selectedCoin?.options;
          const symbol = coin?.symbol?.toUpperCase() ?? '';
          const fiatSymbol = currencySymbol[values.fiatCurrency] || '';
          const amountError = touched.amount && errors.amount;
          const coinError = touched.selectedCoin && errors.selectedCoin;
          const q = coinQuery.trim().toLowerCase();
          const coinList = q
            ? coinOptions.filter(item =>
                `${item.label} ${item.options?.symbol || ''} ${
                  item.options?.chain_display_name || ''
                }`
                  .toLowerCase()
                  .includes(q),
              )
            : coinOptions;
          const canQuote = !!coin && Number(values.amount) > 0;
          const showQuotes = canQuote && !isLoading && quotes.length > 0;

          const setAmount = next => {
            setFieldValue('amount', next);
            onSubmit({...values, amount: next}, true);
          };
          const setCurrency = next => {
            if (next === values.fiatCurrency) return;
            setFieldValue('fiatCurrency', next);
            onSubmit({...values, fiatCurrency: next}, false);
          };
          const pickCoin = item => {
            setCoinSheetOpen(false);
            setCoinQuery('');
            setPickedKey(null);
            setFieldValue('selectedCoin', item);
            onSubmit({...values, selectedCoin: item}, false);
          };

          return (
            <div className={styles.column}>
              <div className={styles.field}>
                <label htmlFor='amount' className={styles.label}>
                  You sell
                </label>
                <div
                  className={`${styles.amountCard} ${
                    amountError || coinError ? styles.inputBoxError : ''
                  }`}>
                  <div className={styles.amountRow}>
                    <input
                      id='amount'
                      className={styles.amountInput}
                      placeholder='0'
                      inputMode='decimal'
                      name='amount'
                      onChange={e =>
                        setAmount(
                          validateNumberInInput(e.target.value, coin?.decimal),
                        )
                      }
                      onBlur={handleBlur('amount')}
                      value={values.amount}
                    />
                    <button
                      type='button'
                      className={styles.coinChip}
                      aria-haspopup='dialog'
                      onClick={() => setCoinSheetOpen(true)}>
                      {coin?.icon ? (
                        <span className={styles.coinChipIcon}>
                          <Image
                            src={coin.icon}
                            alt=''
                            width={24}
                            height={24}
                          />
                        </span>
                      ) : (
                        <PlusIcon size={14} />
                      )}
                      {coin ? symbol : 'Select coin'}
                      <ChevronDownIcon size={13} />
                    </button>
                  </div>
                  {coin ? (
                    <span className={styles.coinMeta}>
                      {values.selectedCoin?.label}
                      {coin?.chain_display_name ? (
                        <span className={styles.chip}>
                          {coin.chain_display_name}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                {amountError && (
                  <p className={styles.error} role='alert'>
                    {errors.amount}
                  </p>
                )}
                {coinError && (
                  <p className={styles.error} role='alert'>
                    {errors.selectedCoin || 'Please select a coin'}
                  </p>
                )}
                {!!coin?.walletAddress && (
                  <div className={styles.addressRow}>
                    <span className={styles.addressLabel}>From</span>
                    <span className={styles.address} title={coin.walletAddress}>
                      {coin.walletAddress}
                    </span>
                    <button
                      type='button'
                      className={`${styles.copy} ${
                        addressCopied ? styles.copyDone : ''
                      }`}
                      aria-label='Copy address'
                      onClick={() => copyAddress(coin.walletAddress)}>
                      {addressCopied ? (
                        <CheckIcon size={14} />
                      ) : (
                        <CopyIcon size={14} />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <span className={styles.label}>You receive</span>
                  <div
                    className={styles.segmented}
                    role='radiogroup'
                    aria-label='Currency'>
                    {CURRENCIES.map(code => (
                      <button
                        key={code}
                        type='button'
                        role='radio'
                        aria-checked={values.fiatCurrency === code}
                        className={`${styles.segment} ${
                          values.fiatCurrency === code
                            ? styles.segmentActive
                            : ''
                        }`}
                        onClick={() => setCurrency(code)}>
                        {currencySymbol[code]} {code}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.receiveCard}>
                  <span className={styles.receiveAmount}>
                    {activeQuote?.hasQuote && !isLoading
                      ? `≈ ${fiatSymbol}${formatFiat(activeQuote.got)}`
                      : '—'}
                  </span>
                  <span className={styles.receiveHint}>
                    {activeQuote?.hasQuote && !isLoading
                      ? `via ${activeQuote.item.title}`
                      : 'Estimated payout appears with the quotes'}
                  </span>
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <span className={styles.label}>Quotes</span>
                  {canQuote ? (
                    <button
                      type='button'
                      className={styles.refresh}
                      disabled={isLoading}
                      onClick={() => onSubmit(values, false)}>
                      <RefreshIcon
                        className={isLoading ? styles.spinning : ''}
                      />
                      {isLoading ? 'Updating…' : 'Refresh'}
                    </button>
                  ) : null}
                </div>
                {!canQuote ? (
                  <div className={styles.quotesEmpty}>
                    {coin
                      ? 'Enter an amount to compare providers'
                      : 'Pick a coin to compare providers'}
                  </div>
                ) : isLoading ? (
                  <div className={styles.quotesLoading}>
                    <Loading />
                  </div>
                ) : !showQuotes ? (
                  <div className={styles.quotesEmpty}>
                    <strong>No providers available</strong>
                    <span>Try another coin or amount</span>
                  </div>
                ) : (
                  <div
                    className={styles.quotes}
                    role='radiogroup'
                    aria-label='Provider'>
                    {quotes.map(quote => {
                      const on = activeQuote?.key === quote.key;
                      const {item} = quote;
                      const amountSold = Number(item?.fromAmount);
                      const rate =
                        quote.hasQuote && amountSold > 0
                          ? `1 ${symbol} ≈ ${fiatSymbol}${formatFiat(
                              quote.got / amountSold,
                            )}`
                          : 'Quote on the provider site';
                      return (
                        <button
                          key={quote.key}
                          type='button'
                          role='radio'
                          aria-checked={on}
                          className={`${styles.quote} ${
                            on ? styles.quoteOn : ''
                          }`}
                          onClick={() => setPickedKey(quote.key)}>
                          <span className={styles.providerLogo}>
                            <Image
                              src={item.src}
                              alt=''
                              width={38}
                              height={38}
                            />
                          </span>
                          <span className={styles.quoteText}>
                            <span className={styles.quoteTitleRow}>
                              <span className={styles.quoteName}>
                                {item.title}
                              </span>
                              {quote.isBest ? (
                                <span className={styles.bestBadge}>
                                  Best payout
                                </span>
                              ) : null}
                            </span>
                            <span className={styles.quoteSub}>{rate}</span>
                          </span>
                          <span className={styles.quoteRight}>
                            {quote.hasQuote ? (
                              <span className={styles.quoteGot}>
                                {fiatSymbol}
                                {formatFiat(quote.got)}
                              </span>
                            ) : null}
                            {quote.diff != null ? (
                              <span className={styles.quoteDiff}>
                                {(quote.diff * 100).toFixed(2)}%
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className={styles.note}>
                <InfoIcon size={16} />
                <span>
                  You confirm the sale on the provider&apos;s site, then send
                  the coins from this wallet on the next screen.
                </span>
              </p>

              <div className={styles.cta}>
                <GeneralButton
                  fullWidth
                  className={styles.ctaButton}
                  disabled={!showQuotes || !activeQuote || pageLoading}
                  onClick={() => activeQuote && onPressItem(activeQuote.item)}>
                  {showQuotes && activeQuote
                    ? `Continue with ${activeQuote.item.title}`
                    : 'Continue'}
                </GeneralButton>
              </div>

              <HomeSheet
                visible={coinSheetOpen}
                onClose={() => {
                  setCoinSheetOpen(false);
                  setCoinQuery('');
                }}
                title='Sell which coin?'
                labelId='sell-coin-title'>
                <label className={styles.sheetSearch}>
                  <SearchIcon size={16} />
                  <input
                    value={coinQuery}
                    onChange={e => setCoinQuery(e.target.value)}
                    placeholder='Search'
                    aria-label='Search coins'
                  />
                </label>
                <div className={styles.sheetList}>
                  {coinList.length ? (
                    coinList.map(item => {
                      const on = item.value === values?.selectedCoin?.value;
                      return (
                        <button
                          key={item.value}
                          type='button'
                          className={`${styles.sheetCoin} ${
                            on ? styles.sheetCoinOn : ''
                          }`}
                          onClick={() => pickCoin(item)}>
                          <span className={styles.sheetCoinIcon}>
                            {item.options?.icon ? (
                              <Image
                                src={item.options.icon}
                                alt=''
                                width={34}
                                height={34}
                              />
                            ) : null}
                          </span>
                          <span className={styles.sheetCoinText}>
                            <span className={styles.sheetCoinTitle}>
                              {item.options?.symbol?.toUpperCase()}
                              {item.options?.chain_display_name ? (
                                <span className={styles.chip}>
                                  {item.options.chain_display_name}
                                </span>
                              ) : null}
                            </span>
                            <span className={styles.sheetCoinName}>
                              {item.label}
                            </span>
                          </span>
                          {on ? <CheckIcon size={18} /> : null}
                        </button>
                      );
                    })
                  ) : (
                    <p className={styles.sheetEmpty}>No coins found</p>
                  )}
                </div>
                <button
                  type='button'
                  className={styles.sheetAdd}
                  onClick={() => {
                    setCoinSheetOpen(false);
                    setModalAddCoinsVisible(true);
                  }}>
                  <PlusIcon size={16} />
                  Add more coins to this wallet
                </button>
              </HomeSheet>
            </div>
          );
        }}
      </Formik>

      {modalAddCoinsVisible && (
        <ModalAddCoins
          visible={modalAddCoinsVisible}
          hideModal={setModalAddCoinsVisible}
        />
      )}
      {pageLoading && <ModalLoad open={pageLoading} title={pageLoadingTitle} />}
      <WalletSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
    </main>
  );
};

export default SellCrypto;
