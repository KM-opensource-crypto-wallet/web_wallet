'use client';
import styles from './ReceivePaymentUrl.module.css';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {useRouter} from 'next/navigation';
import {
  getUserCoinsOptions,
  selectCurrentWallet,
  selectUserCoins,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
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
import {getDesktopWalletUrl} from 'whitelabel/whiteLabelInfo';
import {getCoinSlug} from 'utils/common';
import {paymentLinkPath} from 'utils/routes';
import {
  multiplyBNWithFixed,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import BigNumber from 'bignumber.js';
import CoinIcon from 'components/CoinIcon';
import GeneralButton from 'components/Button';
import CoinPicker from 'components/Home/CoinPicker';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/useHome';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CopyIcon,
  InfoIcon,
} from 'components/Home/HomeIcons';
import {currencySymbol} from 'data/currency';

const coinKey = item => `${item?.chain_name}_${item?.symbol}`;

// Payment link: pick a coin and an amount, then share a link the payer opens
// on their own wallet to send it.
const ReceivePaymentUrl = () => {
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
          <h1 className={styles.headingTitle}>Payment link</h1>
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

      <div className={styles.column}>
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
            // Wallet-agnostic on purpose: the payer opens this on their own
            // wallet, and the /wallet/home forwarder resolves the coin from
            // the slug in the path.
            const selectedCoin = values?.coin?.options;
            const symbol = selectedCoin?.symbol || '';
            const pickedCoin = pickerCoins.find(
              item => coinKey(item) === values?.coin?.value,
            );
            const url = `${getDesktopWalletUrl()}${paymentLinkPath(
              getCoinSlug(selectedCoin),
            )}?address=${encodeURIComponent(
              selectedCoin?.walletAddress ?? '',
            )}&amount=${encodeURIComponent(values?.amount ?? '')}`;
            const hasLink = !!(values?.amount && selectedCoin?.chain_name);
            return (
              <>
                <section className={styles.card} aria-label='Payment details'>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Coin</span>
                    <button
                      type='button'
                      className={styles.coinCard}
                      aria-haspopup='dialog'
                      onClick={() => setPickerOpen(true)}>
                      {selectedCoin ? (
                        <>
                          <span className={styles.coinIcon}>
                            <CoinIcon item={pickedCoin || selectedCoin} />
                          </span>
                          <span className={styles.coinText}>
                            <span className={styles.coinSymbol}>
                              {symbol}
                              {selectedCoin?.chain_display_name ? (
                                <span className={styles.network}>
                                  {selectedCoin.chain_display_name}
                                </span>
                              ) : null}
                            </span>
                            <span className={styles.coinName}>
                              {selectedCoin?.title}
                            </span>
                          </span>
                        </>
                      ) : (
                        <span className={styles.coinPlaceholder}>
                          Select crypto
                        </span>
                      )}
                      <ChevronDownIcon
                        size={18}
                        className={styles.coinChevron}
                      />
                    </button>
                  </div>

                  <div className={styles.field}>
                    <label
                      className={styles.fieldLabel}
                      htmlFor='payment-amount'>
                      Amount
                    </label>
                    <div
                      className={`${styles.inputRow} ${
                        errors.amount ? styles.inputError : ''
                      }`}>
                      <input
                        id='payment-amount'
                        className={styles.input}
                        placeholder='0.00'
                        inputMode='decimal'
                        name='amount'
                        disabled={!selectedCoin}
                        onChange={e => {
                          const tempValues = validateNumberInInput(
                            e.target.value,
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
                        }}
                        onBlur={handleBlur('amount')}
                        value={values.amount}
                        type='number'
                      />
                      {symbol ? (
                        <span className={styles.unit}>{symbol}</span>
                      ) : null}
                    </div>
                    {errors.amount ? (
                      <p className={styles.error}>{errors.amount}</p>
                    ) : null}
                  </div>

                  <div className={styles.field}>
                    <label
                      className={styles.fieldLabel}
                      htmlFor='payment-currency-amount'>
                      Value in {localCurrency}
                    </label>
                    <div
                      className={`${styles.inputRow} ${
                        errors.currencyAmount ? styles.inputError : ''
                      }`}>
                      {fiatSymbol ? (
                        <span className={styles.prefix}>{fiatSymbol}</span>
                      ) : null}
                      <input
                        id='payment-currency-amount'
                        className={styles.input}
                        placeholder='0.00'
                        inputMode='decimal'
                        name='currencyAmount'
                        disabled={!selectedCoin}
                        onChange={e => {
                          const tempValues = validateNumberInInput(
                            e.target.value,
                            2,
                          );
                          setFieldValue('currencyAmount', tempValues);
                          dispatch(setPaymentUrlCurrencyAmount(tempValues));
                          const tempAmount = new BigNumber(tempValues)
                            .dividedBy(
                              new BigNumber(selectedCoin?.currencyRate),
                            )
                            .toFixed(Number(selectedCoin?.decimal));
                          dispatch(setPaymentUrlAmount(tempAmount));
                          setFieldValue('amount', tempAmount);
                        }}
                        onBlur={handleBlur('currencyAmount')}
                        value={values.currencyAmount}
                        type='number'
                      />
                      <span className={styles.unit}>{localCurrency}</span>
                    </div>
                    {errors.currencyAmount ? (
                      <p className={styles.error}>{errors.currencyAmount}</p>
                    ) : null}
                  </div>
                </section>

                <section className={styles.card} aria-label='Payment link'>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Your payment link</span>
                    {hasLink ? (
                      <div className={styles.fieldRow}>
                        <p className={styles.url}>{url}</p>
                        <GeneralButton
                          variant='unstyled'
                          className={`${styles.copy} ${
                            copied ? styles.copyDone : ''
                          }`}
                          aria-label='Copy payment link'
                          onClick={() => copyUrl(url)}>
                          {copied ? (
                            <CheckIcon size={16} />
                          ) : (
                            <CopyIcon size={16} />
                          )}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </GeneralButton>
                      </div>
                    ) : (
                      <p className={styles.fieldHint}>
                        {selectedCoin
                          ? 'Enter an amount to create your link.'
                          : 'Select a coin and enter an amount to create your link.'}
                      </p>
                    )}
                  </div>
                </section>

                <p className={styles.note}>
                  <InfoIcon size={16} />
                  <span>
                    Anyone with this link can open it in their wallet to send
                    you {symbol || 'crypto'}
                    {selectedCoin?.chain_display_name
                      ? ` on ${selectedCoin.chain_display_name}`
                      : ''}
                    .
                  </span>
                </p>
              </>
            );
          }}
        </Formik>
      </div>

      <CoinPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title='Request which coin?'
        coins={pickerCoins}
        hidden={pickerOpen && readHideBalances()}
        localCurrency={localCurrency}
        onPick={onPickCoin}
      />
      <WalletSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
    </main>
  );
};

export default ReceivePaymentUrl;
