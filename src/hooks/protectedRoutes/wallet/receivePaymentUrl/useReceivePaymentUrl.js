import {useCallback, useMemo, useRef, useState} from 'react';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {useRouter} from 'next/navigation';
import BigNumber from 'bignumber.js';
import {
  getUserCoinsOptions,
  selectCurrentWallet,
  selectUserCoins,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
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
import {getDesktopWalletUrl} from 'whitelabel/whiteLabelInfo';
import {getCoinSlug} from 'utils/common';
import {paymentLinkPath} from 'utils/routes';
import {
  multiplyBNWithFixed,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import {currencySymbol} from 'data/currency';

const coinKey = item => `${item?.chain_name}_${item?.symbol}`;

// Logic for the Payment link screen: pick a coin and an amount, then share a
// link the payer opens on their own wallet to send it.
export const useReceivePaymentUrl = () => {
  const router = useRouter();
  const coinOptions = useSelector(getUserCoinsOptions, shallowEqual);
  const userCoins = useSelector(selectUserCoins);
  const currentWallet = useSelector(selectCurrentWallet);
  const paymentUrlCoin = useSelector(getPaymentUrlCoin);
  const paymentUrlAmount = useSelector(getPaymentUrlAmount);
  const paymentUrlCurrencyAmount = useSelector(getPaymentUrlCurrencyAmount);
  const dispatch = useDispatch();
  const formikRef = useRef();
  const localCurrency = useSelector(getLocalCurrency);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const walletName = currentWallet?.walletName || 'Wallet';
  const fiatSymbol = currencySymbol[localCurrency] || '';

  // The picker sheet lists full coin objects; keep only the ones that have a
  // payment-link option (one per chain + symbol).
  const pickerCoins = useMemo(() => {
    const keys = new Set(coinOptions.map(item => item.value));
    const seen = new Set();
    return (userCoins || []).filter(item => {
      const key = coinKey(item);
      if (!keys.has(key) || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [coinOptions, userCoins]);

  const onPickCoin = useCallback(
    coin => {
      setPickerOpen(false);
      const foundItem = coinOptions.find(item => item.value === coinKey(coin));
      if (foundItem) {
        dispatch(setPaymentUrlCoin(foundItem));
        formikRef?.current?.setFieldValue('coin', foundItem);
      }
    },
    [coinOptions, dispatch],
  );

  const copyUrl = useCallback(url => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, []);

  const initialValues = {
    coin: paymentUrlCoin,
    amount: paymentUrlAmount || '',
    currencyAmount: paymentUrlCurrencyAmount || '',
  };

  // The link and the coin shown for the current form values.
  // Wallet-agnostic on purpose: the payer opens this on their own wallet, and
  // the /wallet/home forwarder resolves the coin from the slug in the path.
  const getPaymentLink = values => {
    const selectedCoin = values?.coin?.options;
    const pickedCoin = pickerCoins.find(
      item => coinKey(item) === values?.coin?.value,
    );
    const url = `${getDesktopWalletUrl()}${paymentLinkPath(
      getCoinSlug(selectedCoin),
    )}?address=${encodeURIComponent(
      selectedCoin?.walletAddress ?? '',
    )}&amount=${encodeURIComponent(values?.amount ?? '')}`;
    const hasLink = !!(values?.amount && selectedCoin?.chain_name);
    return {
      selectedCoin,
      symbol: selectedCoin?.symbol || '',
      pickedCoin,
      url,
      hasLink,
    };
  };

  // Form field handlers. Formik's setFieldValue is only available inside the
  // render prop, so the component passes it in. Both amounts are also kept in
  // redux so the form survives leaving and coming back.
  const changeAmount = (event, selectedCoin, setFieldValue) => {
    const tempValues = validateNumberInInput(
      event.target.value,
      selectedCoin?.decimal,
    );
    dispatch(setPaymentUrlAmount(tempValues));
    const tempAmount = multiplyBNWithFixed(
      tempValues,
      selectedCoin?.currencyRate,
      2,
    );
    setFieldValue('amount', tempValues);
    setFieldValue('currencyAmount', tempAmount);
    dispatch(setPaymentUrlCurrencyAmount(tempAmount));
  };

  const changeCurrencyAmount = (event, selectedCoin, setFieldValue) => {
    const tempValues = validateNumberInInput(event.target.value, 2);
    setFieldValue('currencyAmount', tempValues);
    dispatch(setPaymentUrlCurrencyAmount(tempValues));
    const tempAmount = new BigNumber(tempValues)
      .dividedBy(new BigNumber(selectedCoin?.currencyRate))
      .toFixed(Number(selectedCoin?.decimal));
    dispatch(setPaymentUrlAmount(tempAmount));
    setFieldValue('amount', tempAmount);
  };

  return {
    // Top bar
    goBack: () => router.back(),
    walletName,
    switcherOpen,
    openSwitcher: () => setSwitcherOpen(true),
    closeSwitcher: () => setSwitcherOpen(false),
    localCurrency,
    fiatSymbol,

    // Form
    formikRef,
    initialValues,
    getPaymentLink,
    changeAmount,
    changeCurrencyAmount,

    // Coin picker
    pickerOpen,
    openPicker: () => setPickerOpen(true),
    closePicker: () => setPickerOpen(false),
    pickerCoins,
    onPickCoin,

    // Copy link
    copied,
    copyUrl,
  };
};

export default useReceivePaymentUrl;
