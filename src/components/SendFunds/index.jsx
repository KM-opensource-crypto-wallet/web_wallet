'use client';

import React from 'react';
import {Formik} from 'formik';
import ModalSend from 'components/ModalSend';
import ModalDelegation from 'components/ModalDelegation';
import CoinIcon from 'components/CoinIcon';
import PriceChange from 'components/PriceChange';
import GeneralButton from 'components/Button';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  SwapIcon,
} from 'components/Home/HomeIcons';
import CoinPicker from 'components/Home/CoinPicker';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/home/useHome';
import useSend from 'src/hooks/protectedRoutes/wallet/home/send/useSend';
import s from './SendFunds.module.css';
import ModalAddressPoisoningWarning from 'components/ModalAddressPoisoningWarning';
import {useHederaRecipientLookup} from 'src/hooks/useHederaAccount';

const shortAddress = address =>
  address && address.length > 14
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address || '';

const HEDERA_LOOKUP_DEBOUNCE_MS = 400;

// Hedera recipients can be typed as an EVM address or a `0.0.N` account id;
// show the other identifier, or warn that a brand-new address will be
// auto-created at the sender's expense.
const HederaRecipientHint = ({address, getHederaChain}) => {
  const {status, result: info} = useHederaRecipientLookup({
    address,
    getHederaChain,
    debounceMs: HEDERA_LOOKUP_DEBOUNCE_MS,
  });
  if (status !== 'done' || !info) {
    return null;
  }
  let text = null;
  if (info.inputType === 'accountId') {
    text = !info.exists
      ? 'Account not found'
      : info.evmAddress
        ? `EVM address: ${info.evmAddress}`
        : null;
  } else if (info.inputType === 'evmAddress') {
    text = info.exists
      ? `Account ID: ${info.accountId}`
      : 'New account. A one-time account creation fee is added to the network fee.';
  }
  if (!text) {
    return null;
  }
  return <p className={s.infoText}>{text}</p>;
};

const SendFunds = () => {
  const {
    goBack,
    walletName,
    switcherOpen,
    openSwitcher,
    closeSwitcher,
    currentCoin,
    localCurrency,
    symbol,
    showDelegation,
    delegationLoading,
    delegationModalVisible,
    openDelegationModal,
    closeDelegationModal,
    onRevokeDelegation,
    availableAmount,
    availableAmountCurrency,
    fiatSymbol,
    sendFundsNetwork: showNetwork,
    coinPickerOpen,
    openCoinPicker,
    closeCoinPicker,
    pickerCoins,
    onPickCoin,
    formikRef,
    sendFundsInitialValues,
    sendFundsValidationSchema,
    handleSendFundsSubmit,
    getIsInvoiceAmountLocked,
    setSendMax,
    changeRecipient,
    pasteRecipient,
    changeAmount,
    getConvertedAmount,
    isCrypto,
    toggleUnit,
    isLightning,
    isHedera,
    getHederaChain,
    recents,
    isMemoSupported,
    isBatchSupported,
    addToBatch,
    sendModalVisible,
    setSendModalVisible,
    poisonWarning,
    cancelPoisonWarning,
    continuePoisonWarning,
  } = useSend('sendFunds');

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={goBack}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <GeneralButton
          variant='unstyled'
          className={s.heading}
          aria-haspopup='dialog'
          onClick={openSwitcher}>
          <h1 className={s.headingTitle}>Send</h1>
          <span className={s.headingSub}>
            <span className={s.walletAvatar}>
              {walletName[0].toUpperCase()}
            </span>
            <span className={s.headingSubText}>{walletName}</span>
            <ChevronDownIcon size={12} className={s.headingChevron} />
          </span>
        </GeneralButton>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>

      <div className={s.column}>
        <Formik
          innerRef={formikRef}
          enableReinitialize={true}
          initialValues={sendFundsInitialValues}
          validationSchema={sendFundsValidationSchema}
          onSubmit={handleSendFundsSubmit}>
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            isValid,
            setFieldValue,
          }) => {
            const isInvoiceAmountLocked = getIsInvoiceAmountLocked(values.send);
            const setMax = () => setSendMax(setFieldValue);
            const onChangeRecipient = text =>
              changeRecipient(text, values, setFieldValue);
            const onPaste = () => pasteRecipient(values, setFieldValue);
            const onChangeAmount = raw => changeAmount(raw, setFieldValue);
            const amountError = errors.amount || errors.currencyAmount;
            const converted = getConvertedAmount(values);
            return (
              <form
                className={s.form}
                noValidate
                onSubmit={event => {
                  event.preventDefault();
                  handleSubmit();
                }}>
                <button
                  type='button'
                  className={s.coinCard}
                  aria-haspopup='dialog'
                  onClick={openCoinPicker}>
                  <span className={s.coinIcon}>
                    <CoinIcon item={currentCoin} />
                  </span>
                  <span className={s.coinText}>
                    <span className={s.coinLabel}>
                      Available to send
                      {showNetwork ? (
                        <span className={s.network}>{showNetwork}</span>
                      ) : null}
                    </span>
                    <span className={s.coinBalance}>
                      <span className={s.coinAmount}>{availableAmount}</span>
                      <span className={s.coinSymbol}>{symbol}</span>
                      <span className={s.coinFiat}>
                        {fiatSymbol}
                        {availableAmountCurrency}
                      </span>
                      <PriceChange
                        value={currentCoin?.priceChange24h}
                        className={s.coinChange}
                      />
                    </span>
                  </span>
                  <span className={s.changeChip}>
                    Change
                    <ChevronRightIcon size={12} />
                  </span>
                </button>

                <div className={s.field}>
                  <label htmlFor='send' className={s.label}>
                    Send to
                  </label>
                  <div
                    className={`${s.inputBox} ${
                      errors.send ? s.inputBoxError : ''
                    }`}>
                    <input
                      id='send'
                      className={s.input}
                      placeholder={
                        isLightning
                          ? 'Invoice or Lightning address'
                          : 'Wallet address'
                      }
                      autoComplete='off'
                      spellCheck={false}
                      name='send'
                      onChange={event => onChangeRecipient(event.target.value)}
                      onBlur={handleBlur('send')}
                      value={values.send}
                    />
                    {values.send ? (
                      <button
                        type='button'
                        className={s.clearButton}
                        aria-label='Clear address'
                        onClick={() => onChangeRecipient('')}>
                        <CloseIcon size={12} />
                      </button>
                    ) : (
                      <button
                        type='button'
                        className={s.pasteButton}
                        onClick={onPaste}>
                        Paste
                      </button>
                    )}
                  </div>
                  {errors.send && (
                    <p className={s.error} role='alert'>
                      {errors.send}
                    </p>
                  )}
                  {isHedera && !errors.send && (
                    <HederaRecipientHint
                      address={values.send}
                      getHederaChain={getHederaChain}
                    />
                  )}
                  {isHedera && !!currentCoin?.accountId && (
                    <p className={s.infoText}>
                      {`Your account ID: ${currentCoin.accountId}`}
                    </p>
                  )}
                  {!values.send && recents.length ? (
                    <div className={s.recents}>
                      <span className={s.recentsLabel}>Recent</span>
                      <div className={s.recentsRow}>
                        {recents.map(address => (
                          <button
                            key={address}
                            type='button'
                            className={s.recent}
                            title={address}
                            onClick={() => onChangeRecipient(address)}>
                            <span className={s.recentAvatar}>
                              {address.slice(2, 3).toUpperCase()}
                            </span>
                            <span className={s.recentText}>
                              {shortAddress(address)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className={s.field}>
                  <div className={s.labelRow}>
                    <label htmlFor='amount' className={s.label}>
                      Amount
                    </label>
                    {!isInvoiceAmountLocked && currentCoin?.currencyRate ? (
                      <button
                        type='button'
                        className={s.unitSwap}
                        onClick={toggleUnit}>
                        <SwapIcon size={13} />
                        Enter in {isCrypto ? localCurrency : symbol}
                      </button>
                    ) : null}
                  </div>
                  <div
                    className={`${s.amountCard} ${
                      amountError ? s.inputBoxError : ''
                    } ${isInvoiceAmountLocked ? s.inputBoxLocked : ''}`}>
                    <div className={s.amountRow}>
                      <input
                        id='amount'
                        className={s.amountInput}
                        placeholder='0'
                        inputMode='decimal'
                        name={isCrypto ? 'amount' : 'currencyAmount'}
                        readOnly={isInvoiceAmountLocked}
                        onChange={event => onChangeAmount(event.target.value)}
                        onBlur={handleBlur(
                          isCrypto ? 'amount' : 'currencyAmount',
                        )}
                        value={isCrypto ? values.amount : values.currencyAmount}
                        type='number'
                      />
                      <span className={s.unit}>
                        {isCrypto ? symbol : localCurrency}
                      </span>
                      {!isInvoiceAmountLocked && (
                        <button
                          type='button'
                          className={s.maxButton}
                          onClick={setMax}>
                          Max
                        </button>
                      )}
                    </div>
                    <div className={s.convertedRow}>
                      <span className={s.converted}>≈ {converted}</span>
                    </div>
                  </div>
                  {isInvoiceAmountLocked && (
                    <p className={s.infoText}>
                      This invoice has a fixed amount.
                    </p>
                  )}
                  {errors.amount && (
                    <p className={s.error} role='alert'>
                      {errors.amount}
                    </p>
                  )}
                  {errors.currencyAmount && (
                    <p className={s.error} role='alert'>
                      {errors.currencyAmount}
                    </p>
                  )}
                </div>

                {isMemoSupported && (
                  <div className={s.field}>
                    <label htmlFor='memo' className={s.label}>
                      Memo <span className={s.optional}>· optional</span>
                    </label>
                    <div
                      className={`${s.inputBox} ${
                        errors.memo ? s.inputBoxError : ''
                      }`}>
                      <input
                        id='memo'
                        className={s.input}
                        placeholder='Memo or tag'
                        name='memo'
                        onChange={handleChange('memo')}
                        onBlur={handleBlur('memo')}
                        value={values.memo}
                      />
                    </div>
                    <p className={s.infoText}>
                      Only needed when the recipient asks for one, e.g. an
                      exchange deposit.
                    </p>
                    {errors.memo && (
                      <p className={s.error} role='alert'>
                        {errors.memo}
                      </p>
                    )}
                  </div>
                )}

                <div className={s.feeRow}>
                  <span>Network fee</span>
                  <span className={s.feeValue}>Shown on the next step</span>
                </div>

                <div className={s.actions}>
                  <GeneralButton
                    type='submit'
                    fullWidth
                    className={s.review}
                    disabled={!isValid}>
                    Review
                  </GeneralButton>
                  {isBatchSupported && (
                    <GeneralButton
                      variant='secondary'
                      fullWidth
                      disabled={!isValid}
                      onClick={addToBatch}>
                      Add to batch
                    </GeneralButton>
                  )}
                </div>
              </form>
            );
          }}
        </Formik>

        {showDelegation && (
          <GeneralButton
            variant='link'
            className={s.delegation}
            loading={delegationLoading}
            loadingLabel='Removing delegation…'
            onClick={openDelegationModal}>
            Remove delegation
          </GeneralButton>
        )}
      </div>

      <CoinPicker
        visible={coinPickerOpen}
        onClose={closeCoinPicker}
        title='Send which coin?'
        coins={pickerCoins}
        hidden={coinPickerOpen && readHideBalances()}
        localCurrency={localCurrency}
        onPick={onPickCoin}
      />
      <WalletSwitcher
        visible={switcherOpen}
        onClose={closeSwitcher}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />

      <ModalDelegation
        visible={delegationModalVisible}
        onClose={closeDelegationModal}
        onConfirm={onRevokeDelegation}
      />

      <ModalSend
        visible={sendModalVisible}
        hideModal={setSendModalVisible}
        currentCoin={currentCoin}
      />

      <ModalAddressPoisoningWarning
        visible={!!poisonWarning}
        suspiciousAddress={poisonWarning?.suspiciousAddress}
        matchedAddress={poisonWarning?.matchedAddress}
        onCancel={cancelPoisonWarning}
        onContinue={continuePoisonWarning}
      />
    </main>
  );
};

export default SendFunds;
