import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';
import {useParams, useRouter} from 'next/navigation';
import {toast} from 'react-toastify';
import {walletRoutes} from 'utils/routes';
import {validateNumber} from 'dok-wallet-blockchain-networks/helper';
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
import {setCurrentTransferSuccess} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {sellCryptoValidation} from 'src/utils/validationSchema';
import {popupCenter} from 'src/utils/common';
import useWallet from 'src/hooks/wallet/useWallet';

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

// Logic for the Sell crypto screen.
export const useSellCrypto = () => {
  const {
    localCurrency,
    coinOptions,
    sellCryptoProviders: cryptoProviders,
    sellCryptoLoading: isLoading,
    currentWallet,
    visibleWallets: allWallets,
    currentWalletClientId,
    sellCryptoError,
  } = useWallet();
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

  const initialValues = {
    amount: '0.1',
    selectedCoin: null,
    fiatCurrency: localCurrency,
  };

  // Coins in the picker sheet, filtered by the search box.
  const query = coinQuery.trim().toLowerCase();
  const coinList = query
    ? coinOptions.filter(item =>
        `${item.label} ${item.options?.symbol || ''} ${
          item.options?.chain_display_name || ''
        }`
          .toLowerCase()
          .includes(query),
      )
    : coinOptions;

  // Form field handlers. Formik's values and setFieldValue are only available
  // inside the render prop, so the component passes them in.
  const changeAmount = (next, values, setFieldValue) => {
    setFieldValue('amount', next);
    onSubmit({...values, amount: next}, true);
  };

  const changeCurrency = (next, values, setFieldValue) => {
    if (next === values.fiatCurrency) return;
    setFieldValue('fiatCurrency', next);
    onSubmit({...values, fiatCurrency: next}, false);
  };

  const pickCoin = (item, values, setFieldValue) => {
    setCoinSheetOpen(false);
    setCoinQuery('');
    setPickedKey(null);
    setFieldValue('selectedCoin', item);
    onSubmit({...values, selectedCoin: item}, false);
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
    initialValues,
    sellCryptoValidation,
    onSubmit,
    changeAmount,
    changeCurrency,

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
    refreshQuote: values => onSubmit(values, false),
    continueWithActiveQuote: () => activeQuote && onPressItem(activeQuote.item),

    // Modals
    pageLoading,
    pageLoadingTitle,
    modalAddCoinsVisible,
    setModalAddCoinsVisible,
  };
};

export default useSellCrypto;
