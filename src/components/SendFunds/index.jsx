'use client';

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
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {useSearchParams} from 'next/navigation';
import {useParams} from 'next/navigation';
import {useRouter} from 'next/navigation';
import ModalSend from 'components/ModalSend';
import ModalDelegation from 'components/ModalDelegation';
import {
  searchCoinFromCurrency,
  revokeDelegation,
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
} from 'dok-wallet-blockchain-networks/helper';
import PageTitle from 'components/PageTitle';
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
  const {clientId} = useParams();
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

  useEffect(() => {
    const currency = searchParams?.get('currency');
    if (currency) {
      dispatch(searchCoinFromCurrency({currency}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (new BigNumber(availableAmount).gt(new BigNumber(0))) {
      setMaxAmount(availableAmount);
    }
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
        router.push(`/wallet/${clientId}/home/send/send-funds/transfer`);
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

  return (
    <>
      <PageTitle title='Send Funds' />
      <div className={s.contentContainerStyle}>
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
            touched,
            isValid,
            setFieldValue,
          }) => {
            // Fixed-amount BOLT11 invoices must be paid exactly, so the amount
            // fields stay locked while such an invoice is entered.
            const isInvoiceAmountLocked =
              isLightning && !!getBolt11InvoiceAmount(values.send);
            return (
              <div style={{display: 'flex', flex: 1}}>
                <div className={s.container}>
                  <div className={s.formInput}>
                    <p className={s.title}>Your balance</p>
                    <div className={s.box}>
                      <p className={s.boxTitle}>{availableAmount}</p>
                      <p className={s.boxTitle}>{' ' + currentCoin?.symbol}</p>
                    </div>
                    <div className={s.box}>
                      <p className={s.boxBalance}>
                        {currencySymbol[localCurrency] || ''}
                        {availableAmountCurrency}
                      </p>
                    </div>

                    <div className={s.boxInputFull}>
                      <p className={s.listTitle}>Send to</p>
                      <input
                        className={s.input}
                        placeholder='Enter wallet adress'
                        style={{
                          borderColor: errors.send ? 'red' : 'var(--gray)',
                        }}
                        name='send'
                        onChange={async event => {
                          const text = event.target.value;
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
                        }}
                        onBlur={handleBlur('send')}
                        value={values.send}
                        onSubmit={handleSubmit}
                      />
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
                      {errors.send && (
                        <p className={s.textConfirm}>{errors.send}</p>
                      )}
                    </div>

                    <div className={s.inputWrapper}>
                      {/* //////////amount//////////// */}
                      <div className={s.boxInput}>
                        <p className={s.listTitle}>Amount</p>
                        <div className={s.inputView}>
                          <input
                            className={s.input}
                            placeholder='Enter amount of Crypto to send'
                            style={{
                              borderColor: errors.amount
                                ? 'red'
                                : 'var(--gray)',
                              color: isInvoiceAmountLocked
                                ? 'var(--gray)'
                                : undefined,
                            }}
                            name='amount'
                            readOnly={isInvoiceAmountLocked}
                            onChange={async event => {
                              const tempValues = validateNumberInInput(
                                event.target.value,
                                currentCoin?.decimal,
                              );
                              const tempAmount = multiplyBNWithFixed(
                                tempValues,
                                currentCoin?.currencyRate,
                                2,
                              );
                              await setFieldValue('amount', tempValues);
                              await setFieldValue('currencyAmount', tempAmount);
                            }}
                            onBlur={handleBlur('amount')}
                            value={values.amount}
                            onSubmit={handleSubmit}
                            type='number'
                          />
                          {!isInvoiceAmountLocked && (
                            <button
                              className={s.btnMax}
                              onClick={async () => {
                                await setFieldValue(
                                  'currencyAmount',
                                  availableAmountCurrency,
                                );
                                await setFieldValue('amount', maxAmount + '');
                              }}>
                              <p className={s.btnText}>Max</p>
                            </button>
                          )}
                        </div>

                        {errors.amount && (
                          <p className={s.textConfirm}>{errors.amount}</p>
                        )}
                      </div>
                      <div className={s.boxInput}>
                        <p className={s.listTitle}>Currency Amount</p>
                        <div className={s.inputView}>
                          <input
                            className={s.input}
                            placeholder={`Enter ${localCurrency} amount of Crypto to send`}
                            style={{
                              borderColor: errors.currencyAmount
                                ? 'red'
                                : 'var(--gray)',
                              color: isInvoiceAmountLocked
                                ? 'var(--gray)'
                                : undefined,
                            }}
                            name='currencyAmount'
                            readOnly={isInvoiceAmountLocked}
                            onChange={async event => {
                              const tempValues = validateNumberInInput(
                                event.target.value,
                                2,
                              );
                              const tempAmount = new BigNumber(tempValues)
                                .dividedBy(
                                  new BigNumber(currentCoin?.currencyRate),
                                )
                                .toFixed(Number(currentCoin?.decimal));
                              await setFieldValue('currencyAmount', tempValues);
                              await setFieldValue('amount', tempAmount);
                            }}
                            onBlur={handleBlur('currencyAmount')}
                            value={values.currencyAmount}
                            onSubmit={handleSubmit}
                            type='number'
                          />
                          {!isInvoiceAmountLocked && (
                            <button
                              className={s.btnMax}
                              onClick={async () => {
                                await setFieldValue(
                                  'currencyAmount',
                                  availableAmountCurrency,
                                );
                                await setFieldValue('amount', maxAmount + '');
                              }}>
                              <p className={s.btnText}>Max</p>
                            </button>
                          )}
                        </div>

                        {errors.currencyAmount && (
                          <p className={s.textConfirm}>
                            {errors.currencyAmount}
                          </p>
                        )}
                      </div>
                      {isMemoSupported && (
                        <div className={s.boxInputFull}>
                          <p className={s.listTitle}>Memo</p>
                          <input
                            className={s.input}
                            placeholder='Enter memo'
                            style={{
                              borderColor: errors.memo ? 'red' : 'var(--gray)',
                            }}
                            name='send'
                            onChange={handleChange('memo')}
                            onBlur={handleBlur('memo')}
                            value={values.memo}
                          />
                          <p className={s.infoText}>
                            {
                              'Memo or Tag is optional, It is only required when recipient needed.'
                            }
                          </p>
                          {errors.memo && (
                            <p className={s.textConfirm}>{errors.memo}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {isEip7702SupportedChain(currentCoin?.chain_name) && (
                    <button
                      disabled={!isValid}
                      className={s.button}
                      style={{
                        backgroundColor: isValid
                          ? 'var(--background)'
                          : 'var(--gray)',
                      }}
                      onClick={addToBatch}>
                      <p className={s.buttonTitle}>Add to Batch</p>
                    </button>
                  )}
                  <button
                    disabled={!isValid}
                    className={s.button}
                    style={{
                      backgroundColor: isValid
                        ? 'var(--background)'
                        : 'var(--gray)',
                    }}
                    onClick={handleSubmit}>
                    <p className={s.buttonTitle}>Next</p>
                  </button>
                </div>
              </div>
            );
          }}
        </Formik>

        {currentCoin?.isDelegationAvailable &&
          isEip7702SupportedChain(currentCoin?.chain_name) && (
            <button
              className={s.button}
              disabled={isDelegationLoading}
              style={{
                backgroundColor: isDelegationLoading
                  ? 'var(--gray)'
                  : 'var(--background)',
                marginTop: 12,
              }}
              onClick={() => setIsDelegationModalVisible(true)}>
              <p className={s.buttonTitle}>
                {isDelegationLoading
                  ? 'Removing Delegation…'
                  : 'Remove Delegation'}
              </p>
            </button>
          )}

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
      </div>
    </>
  );
};

export default SendFunds;
