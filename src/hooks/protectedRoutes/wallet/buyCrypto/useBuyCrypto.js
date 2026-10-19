import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useDispatch} from 'react-redux';
import {useParams, useRouter} from 'next/navigation';
import {toast} from 'react-toastify';
import {
  addOTC,
  getBuyCryptoUrl,
} from 'dok-wallet-blockchain-networks/service/dokApi';
import {validateNumber} from 'dok-wallet-blockchain-networks/helper';
import {
  debounceFetchBuyCryptoQuote,
  fetchBuyCryptoQuote,
  setCryptoProviderLoading,
} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProviderSlice';
import {amountValidation} from 'utils/validationSchema';
import {isUsdtNotSupportedWL} from 'src/whitelabel/whiteLabelInfo';
import {getAppIcon, getAppIconDark} from 'whitelabel/whiteLabelInfo';
import {ThemeContext} from 'theme/ThemeContext';
import {walletRoutes} from 'utils/routes';
import useWallet from 'src/hooks/wallet/useWallet';
import {useFormDraft} from 'src/hooks/useFormDraft';
import {BUY_CRYPTO_CURRENCIES, OTC_DETAILS_ROUTE} from 'src/data/constants';

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

// Logic for the Buy crypto screen (app/.../buy-crypto) and the OTC order
// screen (app/.../buy-crypto/otc2).
export const useBuyCrypto = () => {
  const router = useRouter();
  const {
    localCurrency,
    coinOptions,
    cryptoProviders,
    cryptoProvidersLoading: isLoading,
    otcData,
    walletName,
  } = useWallet();
  const dispatch = useDispatch();
  const formikRef = useRef();
  const {draftKey, draft} = useFormDraft();
  const [modalAddCoinsVisible, setModalAddCoinsVisible] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(null);
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

  // Back from a later step: refresh the quotes for the restored values.
  useEffect(() => {
    if (draft) {
      submitQuote(draft, {isDebounce: false});
    }
  }, [draft, submitQuote]);

  const initialValues = draft || {
    amount: '100',
    selectedCoin: null,
    fiatCurrency: eurOnly ? 'EUR' : localCurrency,
  };

  // Coins in the picker sheet, filtered by the search box.
  const query = coinQuery.trim().toLowerCase();
  const coinList = query
    ? finalCoinOptions.filter(item =>
        `${item.label} ${item.options?.symbol || ''} ${
          item.options?.chain_display_name || ''
        }`
          .toLowerCase()
          .includes(query),
      )
    : finalCoinOptions;

  // Form field handlers. Formik's values and setFieldValue are only available
  // inside the render prop, so the component passes them in.
  const changeAmount = (next, values, setFieldValue) => {
    setFieldValue('amount', next);
    submitQuote({...values, amount: next}, {isDebounce: true});
  };

  const cycleCurrency = (values, setFieldValue) => {
    const next =
      BUY_CRYPTO_CURRENCIES[
        (BUY_CRYPTO_CURRENCIES.indexOf(values.fiatCurrency) + 1) %
          BUY_CRYPTO_CURRENCIES.length
      ];
    setFieldValue('fiatCurrency', next);
    submitQuote({...values, fiatCurrency: next});
  };

  const pickCoin = (item, values, setFieldValue) => {
    setCoinSheetOpen(false);
    setCoinQuery('');
    setPickedKey(null);
    setFieldValue('selectedCoin', item);
    submitQuote({...values, selectedCoin: item});
  };

  // ---- OTC order ----

  const [otcState, setOtcState] = useState({
    isBuy: true,
    selectedCryptoCoin: {},
    selectedAmount: '',
    sourceOfFund: '',
    terms: false,
    risk: false,
  });
  const [isOtcSubmitting, setIsOtcSubmitting] = useState(false);
  const [otcCoinPickerOpen, setOtcCoinPickerOpen] = useState(false);
  const [otcCoinQuery, setOtcCoinQuery] = useState('');
  const {themeType} = useContext(ThemeContext);
  const {clientId} = useParams();

  const otherOptions = {
    label: 'Other',
    value: 'Other',
    options: {
      icon: themeType === 'light' ? getAppIcon() : getAppIconDark(),
      title: 'Other',
    },
  };

  const [dropDownList] = useState(
    Array.isArray(coinOptions)
      ? [...coinOptions, otherOptions]
      : [otherOptions],
  );

  const onChangeCryptoCoin = useCallback(
    value => {
      const foundItem = dropDownList.find(item => item.value === value);
      if (foundItem) {
        setOtcState(prevState => ({
          ...prevState,
          selectedCryptoCoin: foundItem,
        }));
      }
    },
    [dropDownList],
  );

  const onChangeOtcAmount = useCallback(value => {
    setOtcState(prevState => ({
      ...prevState,
      selectedAmount: value,
    }));
  }, []);

  const {isBuy, risk, selectedAmount, selectedCryptoCoin, sourceOfFund, terms} =
    otcState;
  const selectedChainName = selectedCryptoCoin?.options?.chain_name;
  const selectedSymbol = selectedCryptoCoin?.options?.symbol;
  const selectedWalletAddress = selectedCryptoCoin?.options?.walletAddress;

  const onOtcSubmit = useCallback(async () => {
    // The personal details come from the previous step (/contact-us/otc).
    // Without them (e.g. OTC2 opened directly or after a reload) there is
    // nothing to submit, so send the user back to fill them in.
    if (!otcData) {
      toast.error('Please fill in your details first');
      router.push(OTC_DETAILS_ROUTE);
      return;
    }
    const toastId = toast.loading('OTC Request Submitting', {
      autoClose: false,
    });
    try {
      const previousOTCData = otcData;
      setIsOtcSubmitting(true);
      const postCode = previousOTCData?.zipcode;
      const payload = {
        fullName: previousOTCData?.fullname,
        email: previousOTCData?.email,
        address1: previousOTCData?.address1,
        city: previousOTCData?.city,
        postCode: postCode,
        country: previousOTCData?.country,
        fundSource: sourceOfFund?.toLowerCase(),
        chain: selectedChainName,
        asset: selectedSymbol,
        type: isBuy ? 'buy' : 'sell',
        amount: `${selectedAmount} ${localCurrency}`,
        walletAddress: selectedWalletAddress,
      };
      if (previousOTCData?.address2) {
        payload.address2 = previousOTCData?.address2;
      }
      const resp = await addOTC(payload);
      setIsOtcSubmitting(false);
      if (resp?.status === 200) {
        toast.dismiss(toastId);
        toast.success('OTC Request submitted successfully');
        router.push(walletRoutes.home(clientId));
      } else {
        toast.dismiss(toastId);
        toast.error('Something went wrong');
      }
    } catch (e) {
      console.error(' Error in add OTC', e);
      setIsOtcSubmitting(false);
      toast.dismiss(toastId);
      toast.error('Something went wrong');
    }
  }, [
    otcData,
    sourceOfFund,
    selectedChainName,
    selectedSymbol,
    selectedWalletAddress,
    isBuy,
    selectedAmount,
    localCurrency,
    router,
    clientId,
  ]);

  const isOtcDisabled =
    !risk ||
    !selectedAmount ||
    !selectedCryptoCoin?.value ||
    !sourceOfFund ||
    !terms ||
    isOtcSubmitting;

  const otcCoinResults = useMemo(() => {
    const q = otcCoinQuery.trim().toLowerCase();
    return q
      ? dropDownList.filter(
          item =>
            item?.options?.title?.toLowerCase().includes(q) ||
            item?.options?.symbol?.toLowerCase().includes(q),
        )
      : dropDownList;
  }, [otcCoinQuery, dropDownList]);

  const closeOtcCoinPicker = () => {
    setOtcCoinQuery('');
    setOtcCoinPickerOpen(false);
  };

  return {
    // Top bar
    walletName,
    switcherOpen,
    openSwitcher: () => setSwitcherOpen(true),
    closeSwitcher: () => setSwitcherOpen(false),
    localCurrency,

    // Form
    formikRef,
    draftKey,
    initialValues,
    amountValidation,
    onSubmit,
    eurOnly,
    changeAmount,
    cycleCurrency,

    // Coin picker sheet
    coinSheetOpen,
    openCoinSheet: () => setCoinSheetOpen(true),
    closeCoinSheet: () => {
      setCoinSheetOpen(false);
      setCoinQuery('');
    },
    coinQuery,
    onCoinQueryChange: e => setCoinQuery(e.target.value),
    coinList,
    pickCoin,
    openAddCoins: () => {
      setCoinSheetOpen(false);
      setModalAddCoinsVisible(true);
    },

    // Address
    addressCopied,
    copyAddress,

    // Quotes
    isLoading,
    quotes,
    activeQuote,
    pickQuote: setPickedKey,
    refreshQuote: submitQuote,
    loadingIndex,
    continueWithActiveQuote: () =>
      activeQuote && onPressItem(activeQuote.item, activeQuote.index),

    // Modals
    modalAddCoinsVisible,
    setModalAddCoinsVisible,

    // OTC order
    isBuy,
    setIsBuy: buy => setOtcState(prevState => ({...prevState, isBuy: buy})),
    selectedCryptoCoin,
    selectedAmount,
    onChangeOtcAmount,
    sourceOfFund,
    setSourceOfFund: label =>
      setOtcState(prevState => ({...prevState, sourceOfFund: label})),
    otcConsents: {terms, risk},
    toggleOtcConsent: key =>
      setOtcState(prevState => ({...prevState, [key]: !prevState[key]})),
    isOtcDisabled,
    isOtcSubmitting,
    onOtcSubmit,
    otcCoinPickerOpen,
    openOtcCoinPicker: () => setOtcCoinPickerOpen(true),
    closeOtcCoinPicker,
    otcCoinQuery,
    onOtcCoinQueryChange: e => setOtcCoinQuery(e.target.value),
    otcCoinResults,
    pickOtcCoin: value => {
      onChangeCryptoCoin(value);
      closeOtcCoinPicker();
    },
  };
};

export default useBuyCrypto;
