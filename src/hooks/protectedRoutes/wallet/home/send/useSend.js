import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import BigNumber from 'bignumber.js';
import {v4} from 'uuid';
import {useDispatch} from 'react-redux';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import {reportThunkRejection} from 'utils/thunkErrors';
import {copyToClipboard} from 'utils/copyToClipboard';
import {showToast} from 'src/utils/toast';
import {validationSchemaSendFunds} from 'utils/validationSchema';
import {coinRoutes} from 'utils/routes';
import {getCoinSlug, isValidBrowser} from 'utils/common';
import {currencySymbol} from 'src/data/lists/currency';
import {
  addEVMAndTronDeriveAddresses,
  refreshCurrentCoin,
  revokeDelegation,
  setCurrentCoin,
  setIsAddMoreAddressPopupHidden,
  setSelectedDeriveAddress,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  calculateEstimateFee,
  clearSelectedUTXOs,
  updateCurrentTransferData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {setExchangeSuccess} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {addBatchTransaction} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSlice';
import {getCustomRPCWithData} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSelectors';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';
import {findLookalikeAddress} from 'dok-wallet-blockchain-networks/helper/addressPoisoning';
import {getBolt11InvoiceAmount} from 'dok-wallet-blockchain-networks/helper/bolt11';
import {
  delay,
  isBitcoinChain,
  isEip7702SupportedChain,
  isEVMChain,
  isMemoSupportChain,
  isNameSupportChain,
  isPrivateKeyNotSupportedChain,
  isDeriveAddressSupportChain,
  isStakingChain,
  getStakignKey,
  multiplyBNWithFixed,
  validateBigNumberStr,
  validateNumberInInput,
  validateSupportedChain,
} from 'dok-wallet-blockchain-networks/helper';
import {getVisibleDeriveAddresses} from 'dok-wallet-blockchain-networks/service/bitcoinHdAddress';
import {QUICK_ACTIONS} from 'src/data/lists/quickActions';
import useWallet from 'src/hooks/wallet/useWallet';
import {MAX_RECENTS} from 'src/data/constants';

// Logic for the coin screens. `screen` is 'coin' (the coin's Send screen,
// components/Send) or 'sendFunds' (components/SendFunds); it decides which
// data each page fetches on mount.
export const useSend = screen => {
  const router = useRouter();
  const routes = useAppRoutes();
  const dispatch = useDispatch();
  const {
    localCurrency,
    currentCoin,
    currentWallet,
    cryptoProviders: buyProviders,
    exchangeProviders: swapProviders,
    isAddMoreAddressPopupHide,
    isImportWithPrivateKey,
    transferData,
    allCustomRPC,
    sentAddressHistory,
    userCoins,
  } = useWallet();

  const [modalUnclaimDepositVisible, setModalUnclaimDepositVisible] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [delegationModalVisible, setDelegationModalVisible] = useState(false);
  const [delegationLoading, setDelegationLoading] = useState(false);
  const copiedTimer = useRef(null);
  // One sheet serves the picker; the selected entry comes straight back to
  // onChangeSelectedAddress.
  const addressSheetRef = useRef();

  const isBitcoin = isBitcoinChain(currentCoin?.chain_name);
  const isStaking = isStakingChain(
    getStakignKey(currentCoin?.chain_name, currentCoin?.symbol),
  );
  const isDeriveAddressChain = isDeriveAddressSupportChain(
    currentCoin?.chain_name,
  );

  // Change-chain entries are not user accounts, so they only show up in the
  // picker when they actually hold funds (getVisibleDeriveAddresses).
  const deriveAddresses = useMemo(() => {
    return getVisibleDeriveAddresses(
      currentCoin?.chain_name,
      currentCoin?.deriveAddresses,
    );
  }, [currentCoin?.chain_name, currentCoin?.deriveAddresses]);

  const selectedDeriveAddressItem = useMemo(() => {
    return currentCoin?.deriveAddresses?.find(
      subItem => subItem?.address === currentCoin?.address,
    );
  }, [currentCoin?.deriveAddresses, currentCoin?.address]);

  const coinId = useMemo(() => {
    return currentCoin?._id + currentCoin?.name + currentCoin?.chain_name;
  }, [currentCoin]);

  const listOfUnClaimedDeposits = useMemo(() => {
    return currentCoin?.listOfUnClaimedDeposits || [];
  }, [currentCoin]);

  useEffect(() => {
    if (screen === 'coin' && currentCoin?.address) {
      dispatch(
        refreshCurrentCoin({
          isFetchUnclaimDeposit: true,
        }),
      )
        .unwrap()
        .then(() => {
          setIsLoading(false);
        })
        .catch(e => {
          setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinId, dispatch]);

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      if (screen === 'coin' && listOfUnClaimedDeposits?.length && !isLoading) {
        setModalUnclaimDepositVisible(true);
      }
    })();
  }, [screen, isLoading, listOfUnClaimedDeposits?.length]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const onPressAddAddresses = useCallback(() => {
    dispatch(addEVMAndTronDeriveAddresses());
  }, [dispatch]);

  const onPressAddressClose = useCallback(() => {
    dispatch(setIsAddMoreAddressPopupHidden(true));
  }, [dispatch]);

  const hideModal = useCallback(() => {
    setModalUnclaimDepositVisible(false);
  }, []);

  const onChangeSelectedAddress = useCallback(
    async subItem => {
      // Let the sheet's close animation finish before the refresh re-renders
      // the screen underneath it.
      await delay(300);
      dispatch(
        setSelectedDeriveAddress({
          address: subItem?.address,
          chain_name: currentCoin?.chain_name,
        }),
      );

      await dispatch(
        refreshCurrentCoin({
          isFetchUnclaimDeposit: true,
          currentCoin: {
            ...currentCoin,
            address: subItem?.address,
            privateKey: subItem?.privateKey || currentCoin?.privateKey,
          },
        }),
      )
        .unwrap()
        .catch(reportThunkRejection({area: 'coin', op: 'refresh_address'}));
    },
    [currentCoin, dispatch],
  );

  const onSuccessOfPrivateKey = useCallback(() => {
    setShowConfirmModal(false);
    if (currentCoin?.privateKey) {
      copyToClipboard(currentCoin?.privateKey, 'Private key copied', {
        type: 'copyToast',
        message: 'Paste it only into apps you trust.',
        props: {warning: 'Never share your private key with anyone'},
      });
    }
  }, [currentCoin?.privateKey]);

  const onRevokeDelegation = useCallback(async () => {
    setDelegationLoading(true);
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
      setDelegationLoading(false);
    }
  }, [dispatch]);

  const onCopyAddress = useCallback(async () => {
    if (await copyToClipboard(currentCoin?.address)) {
      setAddressCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setAddressCopied(false), 2000);
    }
  }, [currentCoin?.address]);

  const openAddressPicker = useCallback(() => {
    addressSheetRef.current?.present({
      chain_name: currentCoin?.chain_name,
      symbol: currentCoin?.symbol,
      decimal: currentCoin?.decimal,
      items: deriveAddresses,
      selectedAddress: currentCoin?.address,
    });
  }, [currentCoin, deriveAddresses]);

  // ---- Send Funds ----

  const searchParams = useSearchParams();
  const qrAddress = searchParams.get('address');
  const qrAmount = searchParams.get('amount');
  const isLightning = currentCoin?.chain_name === 'bitcoin_lightning';
  const isHedera = currentCoin?.chain_name === 'hedera';
  const [poisonWarning, setPoisonWarning] = useState(null);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  // Which side of the amount is typed: the coin, or the local currency.
  const [unit, setUnit] = useState('crypto');
  const [coinPickerOpen, setCoinPickerOpen] = useState(false);
  const [maxAmount, setMaxAmount] = useState('0.00000');
  const formikRef = useRef(null);

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

  // A fixed-amount invoice must be paid exactly and locks the amount fields
  // (see isInvoiceAmountLocked below), so it outranks any amount carried by the
  // QR/deep link -- otherwise "lightning:lnbc..?amount=" would prefill an
  // uneditable wrong amount. Variable-amount invoices fall through as before.
  const linkInvoiceAmount = useMemo(() => {
    return isLightning ? getBolt11InvoiceAmount(qrAddress) : null;
  }, [isLightning, qrAddress]);
  const [sendInput] = useState(qrAddress || '');

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

  const handleSendFundsSubmit = async values => {
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
      setSendModalVisible(true);
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

  const isBatchSupported = isEip7702SupportedChain(currentCoin?.chain_name);
  const fiatSymbol = currencySymbol[localCurrency] || '';
  const isCrypto = unit === 'crypto';

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

  const sendFundsNetwork =
    currentCoin?.type === 'token' || isBitcoin
      ? currentCoin?.chain_display_name
      : null;

  const sendFundsInitialValues = {
    send: qrAddress || sendInput,
    amount: linkInvoiceAmount || qrAmount || '',
    currencyAmount: linkInvoiceAmount
      ? multiplyBNWithFixed(linkInvoiceAmount, currentCoin?.currencyRate, 2)
      : '',
    memo: '',
  };

  const sendFundsValidationSchema = validationSchemaSendFunds(
    availableAmount,
    availableAmountCurrency,
  );

  // Form field handlers. Formik's values and setFieldValue are only available
  // inside the render prop, so the component passes them in.

  // Fixed-amount BOLT11 invoices must be paid exactly, so the amount fields
  // stay locked while such an invoice is entered.
  const getIsInvoiceAmountLocked = send =>
    isLightning && !!getBolt11InvoiceAmount(send);

  const setSendMax = async setFieldValue => {
    await setFieldValue('currencyAmount', availableAmountCurrency);
    await setFieldValue('amount', maxAmount + '');
  };

  const changeRecipient = async (text, values, setFieldValue) => {
    await setFieldValue('send', text);
    if (!isLightning) {
      return;
    }
    const invoiceAmount = getBolt11InvoiceAmount(text);
    if (invoiceAmount) {
      await setFieldValue('amount', invoiceAmount);
      await setFieldValue(
        'currencyAmount',
        multiplyBNWithFixed(invoiceAmount, currentCoin?.currencyRate, 2),
      );
    } else if (getBolt11InvoiceAmount(values.send)) {
      // The previous recipient was a fixed-amount invoice;
      // its amount no longer applies to this recipient.
      await setFieldValue('amount', '');
      await setFieldValue('currencyAmount', '');
    }
  };

  const pasteRecipient = async (values, setFieldValue) => {
    try {
      const text = (await navigator.clipboard.readText())?.trim();
      if (text) {
        await changeRecipient(text, values, setFieldValue);
      }
    } catch (e) {
      showToast({
        type: 'errorToast',
        title: 'Clipboard unavailable',
        message: 'Paste the address into the field instead.',
      });
    }
  };

  const changeAmount = async (raw, setFieldValue) => {
    if (unit === 'crypto') {
      const tempValues = validateNumberInInput(raw, currentCoin?.decimal);
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

  // The amount shown under the input, in the other unit.
  const getConvertedAmount = values =>
    isCrypto
      ? `${fiatSymbol}${values.currencyAmount || '0.00'}`
      : `${validateBigNumberStr(values.amount) || '0'} ${currentCoin?.symbol?.toUpperCase() ?? ''}`;

  const symbol = currentCoin?.symbol?.toUpperCase() ?? '';
  const walletName = currentWallet?.walletName || 'Wallet';
  const showMenu =
    isBitcoin || (isDeriveAddressChain && !isImportWithPrivateKey);
  const showAddAddressesNotice =
    isDeriveAddressChain &&
    !isBitcoin &&
    !isImportWithPrivateKey &&
    !isAddMoreAddressPopupHide;
  const showAddressSelector =
    (isBitcoin || isDeriveAddressChain) && deriveAddresses?.length > 1;
  const selectedAddressIndex = showAddressSelector
    ? deriveAddresses.findIndex(item => item?.address === currentCoin?.address)
    : -1;
  const showNetwork = currentCoin?.type === 'token' || isBitcoin;
  const showPrivateKey = !isPrivateKeyNotSupportedChain(
    currentCoin?.chain_name,
  );
  const showDelegation =
    !!currentCoin?.isDelegationAvailable &&
    isEip7702SupportedChain(currentCoin?.chain_name);

  // A null handler hides the action.
  const actionHandlers = {
    send: () => {
      dispatch(clearSelectedUTXOs());
      router.push(routes.coin.sendFunds());
    },
    receive: () => router.push(routes.coin.receiveFunds()),
    buy: buyProviders?.length
      ? () => router.push(routes.wallet.buyCrypto())
      : null,
    swap: swapProviders?.length
      ? () => router.push(routes.wallet.swap())
      : null,
  };
  const quickActions = QUICK_ACTIONS.filter(({key}) => actionHandlers[key]).map(
    action => ({...action, onClick: actionHandlers[action.key]}),
  );

  return {
    // Top bar
    walletName,
    switcherOpen,
    openSwitcher: () => setSwitcherOpen(true),
    closeSwitcher: () => setSwitcherOpen(false),
    showMenu,
    isBitcoin,
    isDeriveAddressChain,
    isImportWithPrivateKey,

    // Balance and quick actions
    isLoading,
    currentCoin,
    localCurrency,
    symbol,
    showNetwork,
    quickActions,

    // Add-addresses notice
    showAddAddressesNotice,
    onPressAddAddresses,
    onPressAddressClose,

    // Address card
    showAddressSelector,
    selectedAddressIndex,
    deriveAddresses,
    selectedDeriveAddressItem,
    openAddressPicker,
    addressSheetRef,
    onChangeSelectedAddress,
    addressCopied,
    onCopyAddress,
    goToReceive: () => router.push(routes.coin.receiveFunds()),

    // History and staking
    goToTransactions: () => router.push(routes.coin.transactions()),
    isStaking,
    goToStakingList: () => router.push(routes.coin.stakingList()),

    // Private key
    showPrivateKey,
    showConfirmModal,
    openConfirmModal: () => setShowConfirmModal(true),
    closeConfirmModal: () => setShowConfirmModal(false),
    onSuccessOfPrivateKey,

    // EIP-7702 delegation
    showDelegation,
    delegationLoading,
    delegationModalVisible,
    openDelegationModal: () =>
      !delegationLoading && setDelegationModalVisible(true),
    closeDelegationModal: () => setDelegationModalVisible(false),
    onRevokeDelegation,

    // Unclaimed deposits
    modalUnclaimDepositVisible,
    hideModal,

    // Send Funds: balance and coin picker
    availableAmount,
    availableAmountCurrency,
    fiatSymbol,
    sendFundsNetwork,
    coinPickerOpen,
    openCoinPicker: () => setCoinPickerOpen(true),
    closeCoinPicker: () => setCoinPickerOpen(false),
    pickerCoins,
    onPickCoin,

    // Send Funds: form
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
    toggleUnit: () => setUnit(isCrypto ? 'fiat' : 'crypto'),
    isLightning,
    isHedera,
    getHederaChain,
    recents,
    isMemoSupported,
    isBatchSupported,
    addToBatch,

    // Send Funds: modals
    sendModalVisible,
    setSendModalVisible,
    poisonWarning,
    cancelPoisonWarning: () => setPoisonWarning(null),
    continuePoisonWarning: () => {
      const pending = poisonWarning;
      setPoisonWarning(null);
      pending?.onConfirm?.();
    },
  };
};

export default useSend;
