'use client';

import {useAppRoutes} from 'src/hooks/useAppRoutes';
import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {Formik} from 'formik';
import {useSelector, useDispatch} from 'react-redux';
import {validationSchemaSendFunds} from 'utils/validationSchema';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import BigNumber from 'bignumber.js';
import {
  calculateEstimateFee,
  updateCurrentTransferData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {currencySymbol} from 'data/currency';
import {
  selectCurrentCoin,
  selectCurrentWallet,
  selectUserCoins,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {useRouter, useSearchParams} from 'next/navigation';
import ModalSend from 'components/ModalSend';
import ModalDelegation from 'components/ModalDelegation';
import {
  revokeDelegation,
  setCurrentCoin,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';
import {
  isNameSupportChain,
  isMemoSupportChain,
  multiplyBNWithFixed,
  validateBigNumberStr,
  validateNumberInInput,
  isBitcoinChain,
  isEip7702SupportedChain,
  isEVMChain,
  validateSupportedChain,
} from 'dok-wallet-blockchain-networks/helper';
import CoinIcon from 'components/CoinIcon';
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
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/useHome';
import {coinRoutes} from 'utils/routes';
import {getCoinSlug, isValidBrowser} from 'utils/common';
import s from './SendFunds.module.css';
import {showToast} from 'src/utils/toast';
import {setExchangeSuccess} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {getTransferData} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSelector';
import {v4} from 'uuid';
import {addBatchTransaction} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSlice';
import {
  getCustomRPCWithData,
  selectAllCustomRpc,
} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSelectors';
import {findLookalikeAddress} from 'dok-wallet-blockchain-networks/helper/addressPoisoning';
import {getBolt11InvoiceAmount} from 'dok-wallet-blockchain-networks/helper/bolt11';
import {getSentAddressHistory} from 'dok-wallet-blockchain-networks/redux/sentAddressHistory/sentAddressHistorySelectors';
import ModalAddressPoisoningWarning from 'components/ModalAddressPoisoningWarning';
import {useHederaRecipientLookup} from 'src/hooks/useHederaAccount';

const MAX_RECENTS = 6;

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
  const currentCoin = useSelector(selectCurrentCoin);
  const routes = useAppRoutes();
  const searchParams = useSearchParams();
  const qrAddress = searchParams.get('address');
  const qrAmount = searchParams.get('amount');
  const localCurrency = useSelector(getLocalCurrency);
  const transferData = useSelector(getTransferData);
  const isBitcoin = isBitcoinChain(currentCoin?.chain_name);
  const isLightning = currentCoin?.chain_name === 'bitcoin_lightning';
  const isHedera = currentCoin?.chain_name === 'hedera';
  const allCustomRPC = useSelector(selectAllCustomRpc);
  const currentWallet = useSelector(selectCurrentWallet);
  const sentAddressHistory = useSelector(getSentAddressHistory);
  const [poisonWarning, setPoisonWarning] = useState(null);
  const getHederaChain = useCallback(
    () =>
      getChain(
        currentCoin?.chain_name,
        currentWallet?.phrase,
        getCustomRPCWithData(
          allCustomRPC,
          currentCoin?.chain_name,
          currentWallet?.clientId,
        ),
      ),
    [
      allCustomRPC,
      currentCoin?.chain_name,
      currentWallet?.clientId,
      currentWallet?.phrase,
    ],
  );
  const [modal, setModal] = useState(false);
  // Which side of the amount is typed: the coin, or the local currency.
  const [unit, setUnit] = useState('crypto');
  const [coinPickerOpen, setCoinPickerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const userCoins = useSelector(selectUserCoins);
  const [maxAmount, setMaxAmount] = useState('0.00000');

  // A fixed-amount invoice must be paid exactly and locks the amount fields
  // (see isInvoiceAmountLocked below), so it outranks any amount carried by the
  // QR/deep link -- otherwise "lightning:lnbc..?amount=" would prefill an
  // uneditable wrong amount. Variable-amount invoices fall through as before.
  const linkInvoiceAmount = useMemo(() => {
    return isLightning ? getBolt11InvoiceAmount(qrAddress) : null;
  }, [isLightning, qrAddress]);
  const [sendInput, setSendInput] = useState(qrAddress || '');
  const [isDelegationModalVisible, setIsDelegationModalVisible] =
    useState(false);
  const [isDelegationLoading, setIsDelegationLoading] = useState(false);
  const dispatch = useDispatch();
  const formikRef = useRef(null);

  const uuid = useMemo(() => {
    return v4();
  }, []);

  const availableAmount = useMemo(() => {
    const amount =
      (isBitcoin && transferData?.selectedUTXOsValue) ||
      currentCoin?.totalAmount ||
      '0';

    const minBalance = currentCoin?.minimumBalance || '0';
    // toFixed, never toString: a balance under 1e-7 would render as "1.3e-7".
    return new BigNumber(amount).minus(new BigNumber(minBalance)).toFixed();
  }, [
    isBitcoin,
    currentCoin?.minimumBalance,
    currentCoin?.totalAmount,
    transferData?.selectedUTXOsValue,
  ]);

  const availableAmountCurrency = useMemo(() => {
    return multiplyBNWithFixed(availableAmount, currentCoin?.currencyRate, 2);
  }, [availableAmount, currentCoin?.currencyRate]);
  const isMemoSupported = useMemo(() => {
    return isMemoSupportChain(currentCoin?.chain_name);
  }, [currentCoin?.chain_name]);

  // useEffect(() => {
  //   if (qrAddress) {
  //     formikRef?.current?.setFieldValue("send", qrAddress);
  //   }
  //   if (qrAmount) {
  //     formikRef?.current?.setFieldValue("amount", qrAmount);
  //   }
  //   if (qrAddress || qrAmount) {
  //     setTimeout(() => {
  //       formikRef?.current?.setFieldTouched("send", true);
  //       formikRef?.current?.setFieldTouched("amount", true);
  //     }, 0);
  //   }
  // }, [newDate, qrAddress, qrAmount]);

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      if (new BigNumber(availableAmount).gt(new BigNumber(0))) {
        setMaxAmount(availableAmount);
      }
    })();
  }, [availableAmount]);

  const validateRecipientAddress = useCallback(
    async sendValue => {
      const customRPC = getCustomRPCWithData(
        allCustomRPC,
        currentCoin?.chain_name,
        currentWallet?.clientId,
      );
      const currentChain = getChain(
        currentCoin?.chain_name,
        currentWallet?.phrase,
        customRPC,
      );
      const isValid = await currentChain.isValidAddress({address: sendValue});
      let validAddress = null;
      if (!isValid && isNameSupportChain(currentCoin?.chain_name)) {
        validAddress = await currentChain?.isValidName({name: sendValue});
      }
      return {isValid, validAddress};
    },
    [
      allCustomRPC,
      currentCoin?.chain_name,
      currentWallet?.clientId,
      currentWallet?.phrase,
    ],
  );

  const checkPoisoningThenProceed = useCallback(
    (resolvedToAddress, proceed) => {
      const lookalikeAddress = findLookalikeAddress({
        inputAddress: resolvedToAddress,
        chain_name: currentCoin?.chain_name,
        sentHistory: sentAddressHistory,
        addressBook: [],
      });
      if (lookalikeAddress) {
        setPoisonWarning({
          suspiciousAddress: resolvedToAddress,
          matchedAddress: lookalikeAddress,
          onConfirm: proceed,
        });
      } else {
        proceed();
      }
    },
    [currentCoin?.chain_name, sentAddressHistory],
  );

  const handleSubmitForm = async values => {
    if (
      currentCoin?.chain_name === 'polkadot' ||
      currentCoin.chain_name === 'cardano'
    ) {
      const availableAmountBN = new BigNumber(availableAmount);
      const amount = new BigNumber(values.amount);
      if (
        currentCoin.chain_name === 'polkadot' &&
        availableAmountBN.minus(amount).lt(new BigNumber(1.1)) &&
        !availableAmountBN.eq(amount)
      ) {
        showToast({
          type: 'errorToast',
          title: 'Polkadot warning',
          message: 'Required minimum 1 DOT or send total amount',
        });
        return;
      }
      if (currentCoin.chain_name === 'cardano') {
        if (amount.lt(new BigNumber(1))) {
          formikRef?.current?.setFieldError(
            'amount',
            'minimum 1 ADA is required for transaction',
          );
          return;
        }
        if (
          !amount.eq(availableAmountBN) &&
          availableAmountBN.minus(amount).lt(new BigNumber(1))
        ) {
          formikRef?.current?.setFieldError(
            'amount',
            'Remaining balance is less than 1 ADA, please send max amount',
          );
          return;
        }
      }
    }
    if (new BigNumber(values.amount).gt(availableAmount)) {
      setModal(true);
      return;
    }

    const {isValid, validAddress} = await validateRecipientAddress(
      values?.send,
    );
    if (isValid || validAddress) {
      const resolvedToAddress = validAddress || values?.send?.trim();
      checkPoisoningThenProceed(resolvedToAddress, () => {
        dispatch(
          // Full reset+merge: drops whatever a previous flow (exchange quote,
          // staking, NFT, batch) left behind in transferData. The UTXO fields
          // are the one thing set before this dispatch (SelectUTXOs screen)
          // that the fee poll, the max clamp and the send itself still read
          // from the store, so they must be carried through the reset.
          updateCurrentTransferData({
            toAddress: resolvedToAddress,
            currentCoin,
            amount: validateBigNumberStr(values?.amount),
            initialAmount:
              currentCoin?.type !== 'token' &&
              validateBigNumberStr(values?.amount),
            isSendFunds: true,
            validName: validAddress ? values?.send : null,
            memo: values?.memo?.trim(),
            selectedUTXOs: transferData?.selectedUTXOs,
            selectedUTXOsValue: transferData?.selectedUTXOsValue,
          }),
        );
        dispatch(
          calculateEstimateFee({
            isFetchNonce: true,
            fromAddress: currentCoin?.address,
            toAddress: resolvedToAddress,
            amount: validateBigNumberStr(values?.amount),
            contractAddress: currentCoin?.contractAddress,
            balance: availableAmount,
            memo: values?.memo?.trim(),
            selectedUTXOs: transferData?.selectedUTXOs,
          }),
        );
        dispatch(setExchangeSuccess(false));
        dispatch(
          setRouteStateData({
            transfer: {
              fromScreen: 'SendFunds',
            },
          }),
        );
        router.push(routes.coin.transfer());
      });
    } else {
      formikRef?.current?.setFieldError('send', 'address is not valid');
    }
  };

  const router = useRouter();

  const addToBatch = useCallback(async () => {
    const values = formikRef.current.values;
    const {isValid, validAddress} = await validateRecipientAddress(
      values?.send,
    );
    if (isValid || validAddress) {
      // The button shares the Next button's `isValid` gate, but Next runs the
      // schema through handleSubmit and this path does not: until validation
      // has run once `errors` is empty, so `isValid` is true on an untouched
      // form. An empty amount would reach validateBigNumberStr, which turns it
      // into '0' and silently queues a zero-value call. SET_ERRORS from
      // validateForm surfaces the message and disables the button.
      const formErrors = await formikRef.current.validateForm();
      if (formErrors?.amount) {
        return;
      }
      const resolvedToAddress = validAddress || values?.send?.trim();
      checkPoisoningThenProceed(resolvedToAddress, () => {
        dispatch(
          addBatchTransaction({
            transactionId: uuid,
            selectedCoin: currentCoin,
            transferData: {
              contractAddress: currentCoin?.contractAddress,
              fromAddress: currentCoin?.address,
              toAddress: resolvedToAddress,
              decimals: currentCoin?.decimal,
              amount: validateBigNumberStr(values?.amount),
              fiatAmount: values?.currencyAmount || '0',
            },
            isERC20Token: currentCoin?.type?.toLowerCase() === 'token',
            router,
          }),
        );
      });
    } else {
      formikRef?.current?.setFieldError('send', 'address is not valid');
    }
  }, [
    validateRecipientAddress,
    checkPoisoningThenProceed,
    currentCoin,
    dispatch,
    router,
    uuid,
  ]);

  const symbol = currentCoin?.symbol?.toUpperCase() ?? '';
  const isBatchSupported = isEip7702SupportedChain(currentCoin?.chain_name);
  const fiatSymbol = currencySymbol[localCurrency] || '';
  const walletName = currentWallet?.walletName || 'Wallet';

  // Same coin list as Home's Send picker.
  const pickerCoins = useMemo(
    () =>
      (userCoins || []).filter(
        item =>
          validateSupportedChain(item?.chain_name) &&
          (item?.chain_name !== 'thorchain' || isValidBrowser()),
      ),
    [userCoins],
  );

  // Sent-address history is only kept for EVM chains (shared bucket).
  const recents = useMemo(
    () =>
      isEVMChain(currentCoin?.chain_name)
        ? (sentAddressHistory?.evm || []).slice(0, MAX_RECENTS)
        : [],
    [currentCoin?.chain_name, sentAddressHistory],
  );

  const onPickCoin = useCallback(
    item => {
      setCoinPickerOpen(false);
      dispatch(setCurrentCoin(item?._id));
      router.replace(
        coinRoutes.sendFunds(currentWallet?.clientId, getCoinSlug(item)),
      );
    },
    [currentWallet?.clientId, dispatch, router],
  );

  const showNetwork =
    currentCoin?.type === 'token' || isBitcoin
      ? currentCoin?.chain_display_name
      : null;

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <GeneralButton
          variant='unstyled'
          className={s.heading}
          aria-haspopup='dialog'
          onClick={() => setSwitcherOpen(true)}>
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
          initialValues={{
            send: qrAddress || sendInput,
            amount: linkInvoiceAmount || qrAmount || '',
            currencyAmount: linkInvoiceAmount
              ? multiplyBNWithFixed(
                  linkInvoiceAmount,
                  currentCoin?.currencyRate,
                  2,
                )
              : '',
            memo: '',
          }}
          validationSchema={validationSchemaSendFunds(
            availableAmount,
            availableAmountCurrency,
          )}
          onSubmit={handleSubmitForm}>
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            isValid,
            setFieldValue,
          }) => {
            // Fixed-amount BOLT11 invoices must be paid exactly, so the amount
            // fields stay locked while such an invoice is entered.
            const isInvoiceAmountLocked =
              isLightning && !!getBolt11InvoiceAmount(values.send);
            const setMax = async () => {
              await setFieldValue('currencyAmount', availableAmountCurrency);
              await setFieldValue('amount', maxAmount + '');
            };
            const onChangeRecipient = async text => {
              await setFieldValue('send', text);
              if (!isLightning) {
                return;
              }
              const invoiceAmount = getBolt11InvoiceAmount(text);
              if (invoiceAmount) {
                await setFieldValue('amount', invoiceAmount);
                await setFieldValue(
                  'currencyAmount',
                  multiplyBNWithFixed(
                    invoiceAmount,
                    currentCoin?.currencyRate,
                    2,
                  ),
                );
              } else if (getBolt11InvoiceAmount(values.send)) {
                // The previous recipient was a fixed-amount invoice;
                // its amount no longer applies to this recipient.
                await setFieldValue('amount', '');
                await setFieldValue('currencyAmount', '');
              }
            };
            const onPaste = async () => {
              try {
                const text = (await navigator.clipboard.readText())?.trim();
                if (text) {
                  await onChangeRecipient(text);
                }
              } catch (e) {
                showToast({
                  type: 'errorToast',
                  title: 'Clipboard unavailable',
                  message: 'Paste the address into the field instead.',
                });
              }
            };
            const onChangeAmount = async raw => {
              if (unit === 'crypto') {
                const tempValues = validateNumberInInput(
                  raw,
                  currentCoin?.decimal,
                );
                await setFieldValue('amount', tempValues);
                await setFieldValue(
                  'currencyAmount',
                  multiplyBNWithFixed(tempValues, currentCoin?.currencyRate, 2),
                );
              } else {
                const tempValues = validateNumberInInput(raw, 2);
                await setFieldValue('currencyAmount', tempValues);
                await setFieldValue(
                  'amount',
                  new BigNumber(tempValues)
                    .dividedBy(new BigNumber(currentCoin?.currencyRate))
                    .toFixed(Number(currentCoin?.decimal)),
                );
              }
            };
            const amountError = errors.amount || errors.currencyAmount;
            const isCrypto = unit === 'crypto';
            const converted = isCrypto
              ? `${fiatSymbol}${values.currencyAmount || '0.00'}`
              : `${validateBigNumberStr(values.amount) || '0'} ${symbol}`;
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
                  onClick={() => setCoinPickerOpen(true)}>
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
                        onClick={() => setUnit(isCrypto ? 'fiat' : 'crypto')}>
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

        {currentCoin?.isDelegationAvailable && isBatchSupported && (
          <GeneralButton
            variant='link'
            className={s.delegation}
            loading={isDelegationLoading}
            loadingLabel='Removing delegation…'
            onClick={() => setIsDelegationModalVisible(true)}>
            Remove delegation
          </GeneralButton>
        )}
      </div>

      <CoinPicker
        visible={coinPickerOpen}
        onClose={() => setCoinPickerOpen(false)}
        title='Send which coin?'
        coins={pickerCoins}
        hidden={coinPickerOpen && readHideBalances()}
        localCurrency={localCurrency}
        onPick={onPickCoin}
      />
      <WalletSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />

      <ModalDelegation
        visible={isDelegationModalVisible}
        onClose={() => setIsDelegationModalVisible(false)}
        onConfirm={async () => {
          setIsDelegationLoading(true);
          try {
            await dispatch(revokeDelegation()).unwrap();
            showToast({
              type: 'successToast',
              title: 'Delegation Removed',
              message: 'EIP-7702 delegation has been successfully revoked.',
            });
          } catch (e) {
            console.error('Error revoking delegation', e);
            showToast({
              type: 'errorToast',
              title: 'Failed to Remove Delegation',
              message: 'Something went wrong. Please try again.',
            });
          } finally {
            setIsDelegationLoading(false);
          }
        }}
      />

      <ModalSend
        visible={modal}
        hideModal={setModal}
        currentCoin={currentCoin}
      />

      <ModalAddressPoisoningWarning
        visible={!!poisonWarning}
        suspiciousAddress={poisonWarning?.suspiciousAddress}
        matchedAddress={poisonWarning?.matchedAddress}
        onCancel={() => setPoisonWarning(null)}
        onContinue={() => {
          const pending = poisonWarning;
          setPoisonWarning(null);
          pending?.onConfirm?.();
        }}
      />
    </main>
  );
};

export default SendFunds;
