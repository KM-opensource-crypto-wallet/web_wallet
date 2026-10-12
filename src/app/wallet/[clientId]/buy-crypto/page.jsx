'use client';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Formik} from 'formik';
import styles from './CryptoProviders.module.css';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {useRouter} from 'next/navigation';
import {
  getUserCoinsOptions,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getBuyCryptoUrl} from 'dok-wallet-blockchain-networks/service/dokApi';
import Image from 'next/image';
import {
  validateNumber,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {amountValidation} from 'utils/validationSchema';
import {toast} from 'react-toastify';
import {currencySymbol} from 'data/currency';
import GeneralButton from 'components/Button';
import HomeSheet from 'components/Home/HomeSheet';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/useHome';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  InfoIcon,
  PlusIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
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
import {isUsdtNotSupportedWL} from 'src/whitelabel/whiteLabelInfo';
import ModalRedirect from 'components/ModalRedirect';

const CURRENCIES = ['USD', 'EUR'];
const PRESETS = ['100', '250', '500'];

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

const formatNumber = (value, max = 6) =>
  Number(value).toLocaleString('en-US', {maximumFractionDigits: max});

// Quote cards: the best rate is the largest amount received; the others show
// how far below it they are.
const rankQuotes = providers => {
  const list = Array.isArray(providers) ? providers : [];
  const best = list.reduce((max, item) => {
    const got = Number(item?.toAmount);
    return got > max ? got : max;
  }, 0);
  return list.map((item, index) => {
    const got = Number(item?.toAmount);
    const hasQuote = got > 0 && Number(item?.fromAmount) > 0;
    return {
      item,
      index,
      key: item?.title || String(index),
      hasQuote,
      got,
      isBest: hasQuote && best > 0 && got === best,
      diff: hasQuote && best > 0 && got < best ? (got - best) / best : null,
    };
  });
};

const CryptoProviders = () => {
  const router = useRouter();
  const localCurrency = useSelector(getLocalCurrency);
  const coinOptions = useSelector(getUserCoinsOptions, shallowEqual);
  const cryptoProviders = useSelector(getCryptoProviders);
  const isLoading = useSelector(getCryptoProvidersLoading);
  const currentWallet = useSelector(selectCurrentWallet);
  const dispatch = useDispatch();
  const formikRef = useRef();
  const [modalAddCoinsVisible, setModalAddCoinsVisible] = useState(false);
  const [modalInfoVisible, setModalInfoVisible] = useState(false);
  const [buyCryptoUrl, setBuyCryptoUrl] = useState(null);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const [coinSheetOpen, setCoinSheetOpen] = useState(false);
  const [coinQuery, setCoinQuery] = useState('');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [pickedKey, setPickedKey] = useState(null);
  const copiedTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimerRef.current), []);

  const copyAddress = useCallback(address => {
    navigator.clipboard.writeText(address || '');
    setAddressCopied(true);
    clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setAddressCopied(false), 1500);
  }, []);

  const quotes = useMemo(() => rankQuotes(cryptoProviders), [cryptoProviders]);
  // The picked provider, else the best rate, else the first one.
  const activeQuote =
    quotes.find(q => q.key === pickedKey) ||
    quotes.find(q => q.isBest) ||
    quotes[0] ||
    null;

  const walletName = currentWallet?.walletName || 'Wallet';
  const eurOnly = isUsdtNotSupportedWL();

  const finalCoinOptions = useMemo(() => {
    if (isUsdtNotSupportedWL()) {
      return coinOptions.filter(
        item =>
          !(
            item.options?.symbol?.toUpperCase() === 'USDT' ||
            (item.options?.symbol?.toUpperCase() === 'USDC' &&
              item.options?.chain_name === 'tron')
          ),
      );
    }
    return coinOptions;
  }, [coinOptions]);

  const handleNewTabClose = useCallback(() => {
    setBuyCryptoUrl(null);
    setModalInfoVisible(false);
  }, []);

  const handleNewTabLaunch = useCallback(() => {
    if (!buyCryptoUrl) return;

    const anchor = document.createElement('a');
    anchor.href = buyCryptoUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.referrerPolicy = 'origin';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    handleNewTabClose();
  }, [buyCryptoUrl, handleNewTabClose]);

  const onPressItem = useCallback(async (item, index) => {
    let pendingTab = null;
    try {
      const selectedCoin = formikRef.current?.values?.selectedCoin?.options;
      const amount = formikRef.current?.values?.amount;
      const fiatCurrency = formikRef.current?.values?.fiatCurrency;
      if (!selectedCoin) {
        formikRef?.current?.setFieldError(
          'selectedCoin',
          'Please select a coin',
        );
        formikRef?.current?.setFieldTouched('selectedCoin', true);
        return;
      }
      if (isNaN(Number(amount)) || !Number(amount)) {
        formikRef?.current?.setFieldError(
          'amount',
          'Please enter a valid amount',
        );
        formikRef?.current?.setFieldTouched('amount', true);
        return;
      }

      const url = item?.extraData?.url;
      setSelectedProvider(item);
      if (item.title?.toLowerCase() === 'castor24') {
        return window.open('https://www.castor24.com/login', '_blank');
      }
      if (item.title?.toLowerCase() === '51pegasi') {
        return window.open('https://www.51pegasi.com/login', '_blank');
      } else if (url) {
        return window.open(url, '_blank');
      } else {
        pendingTab = window.open('about:blank', '_blank');
        if (!pendingTab) {
          toast.error('Please allow pop-ups to continue');
          return;
        }
        pendingTab.opener = null;
        setLoadingIndex(index);
        const resp = await getBuyCryptoUrl({
          ...item,
          selectedCoin,
          fiatCurrency,
          amount,
          appVersion: 'web',
          from_device: 'web',
        });
        const redirectUrl = resp?.data;
        if (!redirectUrl) {
          pendingTab.close();
          toast.error('Unable to generate provider link');
          return;
        }
        pendingTab.location.replace(redirectUrl);
      }
    } catch (e) {
      pendingTab?.close();
      toast.error('Something went wrong');
      console.error('Error in press item', e);
    } finally {
      setLoadingIndex(null);
    }
  }, []);

  const submitQuote = useCallback(
    async (values, {isDebounce = false} = {}) => {
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

  const onSubmit = useCallback(
    async values => {
      submitQuote(values, {isDebounce: false});
    },
    [submitQuote],
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
          <h1 className={styles.headingTitle}>Buy</h1>
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
          amount: '100',
          selectedCoin: null,
          fiatCurrency: eurOnly ? 'EUR' : localCurrency,
        }}
        validationSchema={amountValidation}
        onSubmit={onSubmit}>
        {({handleBlur, values, errors, touched, setFieldValue}) => {
          const coin = values?.selectedCoin?.options;
          const symbol = coin?.symbol?.toUpperCase() ?? '';
          const fiatSymbol = currencySymbol[values.fiatCurrency] || '';
          const amountError = touched.amount && errors.amount;
          const coinError = touched.selectedCoin && errors.selectedCoin;
          const q = coinQuery.trim().toLowerCase();
          const coinList = q
            ? finalCoinOptions.filter(item =>
                `${item.label} ${item.options?.symbol || ''} ${
                  item.options?.chain_display_name || ''
                }`
                  .toLowerCase()
                  .includes(q),
              )
            : finalCoinOptions;
          const canQuote = !!coin && Number(values.amount) > 0;
          const showQuotes = canQuote && !isLoading && quotes.length > 0;

          const setAmount = next => {
            setFieldValue('amount', next);
            submitQuote({...values, amount: next}, {isDebounce: true});
          };
          const cycleCurrency = () => {
            const next =
              CURRENCIES[
                (CURRENCIES.indexOf(values.fiatCurrency) + 1) %
                  CURRENCIES.length
              ];
            setFieldValue('fiatCurrency', next);
            submitQuote({...values, fiatCurrency: next});
          };
          const pickCoin = item => {
            setCoinSheetOpen(false);
            setCoinQuery('');
            setPickedKey(null);
            setFieldValue('selectedCoin', item);
            submitQuote({...values, selectedCoin: item});
          };

          return (
            <div className={styles.column}>
              <div className={styles.field}>
                <label htmlFor='amount' className={styles.label}>
                  You pay
                </label>
                <div
                  className={`${styles.amountCard} ${
                    amountError ? styles.inputBoxError : ''
                  }`}>
                  <div className={styles.amountRow}>
                    <span className={styles.fiatPrefix}>{fiatSymbol}</span>
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
                      className={styles.currencyChip}
                      disabled={eurOnly}
                      aria-label={
                        eurOnly
                          ? `Paying in ${values.fiatCurrency}`
                          : `Paying in ${values.fiatCurrency}, change currency`
                      }
                      onClick={cycleCurrency}>
                      {values.fiatCurrency}
                      {eurOnly ? null : <ChevronDownIcon size={12} />}
                    </button>
                  </div>
                  <div className={styles.presets}>
                    {PRESETS.map(preset => (
                      <button
                        key={preset}
                        type='button'
                        className={`${styles.preset} ${
                          values.amount === preset ? styles.presetOn : ''
                        }`}
                        onClick={() => setAmount(preset)}>
                        {fiatSymbol}
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                {amountError && (
                  <p className={styles.error} role='alert'>
                    {errors.amount}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <span className={styles.label}>You get</span>
                <button
                  type='button'
                  className={`${styles.coinCard} ${
                    coinError ? styles.inputBoxError : ''
                  }`}
                  aria-haspopup='dialog'
                  onClick={() => setCoinSheetOpen(true)}>
                  <span className={styles.coinIcon}>
                    {coin?.icon ? (
                      <Image src={coin.icon} alt='' width={40} height={40} />
                    ) : (
                      <PlusIcon size={18} />
                    )}
                  </span>
                  <span className={styles.coinText}>
                    {coin ? (
                      <>
                        <span className={styles.coinGot}>
                          <span className={styles.coinAmount}>
                            {activeQuote?.hasQuote && !isLoading
                              ? `≈ ${formatNumber(activeQuote.got)}`
                              : '—'}
                          </span>
                          <span className={styles.coinSymbol}>{symbol}</span>
                        </span>
                        <span className={styles.coinMeta}>
                          {values.selectedCoin?.label}
                          {coin?.chain_display_name ? (
                            <span className={styles.chip}>
                              {coin.chain_display_name}
                            </span>
                          ) : null}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.coinPlaceholder}>
                          Select a coin
                        </span>
                        <span className={styles.coinMeta}>
                          From the coins in this wallet
                        </span>
                      </>
                    )}
                  </span>
                  <span className={styles.changeChip}>
                    {coin ? 'Change' : 'Select'}
                    <ChevronRightIcon size={12} />
                  </span>
                </button>
                {coinError && (
                  <p className={styles.error} role='alert'>
                    {errors.selectedCoin}
                  </p>
                )}
                {!!coin?.walletAddress && (
                  <div className={styles.addressRow}>
                    <span className={styles.addressLabel}>To</span>
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
                  <span className={styles.label}>Quotes</span>
                  {canQuote ? (
                    <button
                      type='button'
                      className={styles.refresh}
                      disabled={isLoading}
                      onClick={() => submitQuote(values)}>
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
                      const rate =
                        quote.hasQuote && quote.got > 0
                          ? `1 ${symbol} ≈ ${fiatSymbol}${formatNumber(
                              Number(item.fromAmount) / quote.got,
                              2,
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
                                  Best rate
                                </span>
                              ) : null}
                            </span>
                            <span className={styles.quoteSub}>{rate}</span>
                          </span>
                          <span className={styles.quoteRight}>
                            {quote.hasQuote ? (
                              <span className={styles.quoteGot}>
                                {formatNumber(quote.got)} {symbol}
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
                  You finish the purchase on the provider&apos;s site; the coins
                  are sent to the address above.
                </span>
              </p>

              <div className={styles.cta}>
                <GeneralButton
                  fullWidth
                  className={styles.ctaButton}
                  disabled={!showQuotes || !activeQuote}
                  loading={loadingIndex !== null}
                  loadingLabel='Opening provider…'
                  onClick={() =>
                    activeQuote &&
                    onPressItem(activeQuote.item, activeQuote.index)
                  }>
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
                title='Buy which coin?'
                labelId='buy-coin-title'>
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
      {modalInfoVisible && (
        <ModalRedirect
          visible={modalInfoVisible}
          handleClose={handleNewTabClose}
          title={`Redirect to the ${selectedProvider?.title || 'provider'}`}
          message={'You will be automatically redirect in'}
          onOkay={handleNewTabLaunch}
        />
      )}
      <WalletSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
    </main>
  );
};

export default CryptoProviders;
