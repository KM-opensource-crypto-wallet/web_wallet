'use client';
import styles from './ReceivePaymentUrl.module.css';
import React from 'react';
import {Formik} from 'formik';
import CoinIcon from 'components/CoinIcon';
import GeneralButton from 'components/Button';
import CoinPicker from 'components/Home/CoinPicker';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/home/useHome';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CopyIcon,
  InfoIcon,
} from 'components/Home/HomeIcons';
import useReceivePaymentUrl from 'src/hooks/protectedRoutes/wallet/receivePaymentUrl/useReceivePaymentUrl';
import useNavigation from 'src/hooks/navigation/useNavigation';

// Payment link: pick a coin and an amount, then share a link the payer opens
// on their own wallet to send it.
const ReceivePaymentUrl = () => {
  const {
    walletName,
    switcherOpen,
    openSwitcher,
    closeSwitcher,
    localCurrency,
    fiatSymbol,
    formikRef,
    initialValues,
    getPaymentLink,
    changeAmount,
    changeCurrencyAmount,
    pickerOpen,
    openPicker,
    closePicker,
    pickerCoins,
    onPickCoin,
    copied,
    copyUrl,
  } = useReceivePaymentUrl();
  const {goBack} = useNavigation();

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden='true' />
      <div className={styles.topBar}>
        <GeneralButton
          variant='unstyled'
          className={styles.iconButton}
          aria-label='Back'
          onClick={goBack}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <GeneralButton
          variant='unstyled'
          className={styles.heading}
          aria-haspopup='dialog'
          onClick={openSwitcher}>
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
          initialValues={initialValues}
          innerRef={formikRef}
          onSubmit={() => {}}>
          {({handleBlur, values, errors, setFieldValue}) => {
            const {selectedCoin, symbol, pickedCoin, url, hasLink} =
              getPaymentLink(values);
            return (
              <>
                <section className={styles.card} aria-label='Payment details'>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Coin</span>
                    <button
                      type='button'
                      className={styles.coinCard}
                      aria-haspopup='dialog'
                      onClick={openPicker}>
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
                        onChange={e =>
                          changeAmount(e, selectedCoin, setFieldValue)
                        }
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
                        onChange={e =>
                          changeCurrencyAmount(e, selectedCoin, setFieldValue)
                        }
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
        onClose={closePicker}
        title='Request which coin?'
        coins={pickerCoins}
        hidden={pickerOpen && readHideBalances()}
        localCurrency={localCurrency}
        onPick={onPickCoin}
      />
      <WalletSwitcher
        visible={switcherOpen}
        onClose={closeSwitcher}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
    </main>
  );
};

export default ReceivePaymentUrl;
