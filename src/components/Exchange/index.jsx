'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {shallowEqual, useSelector, useDispatch} from 'react-redux';
import {useRouter} from 'next/navigation';
import BigNumber from 'bignumber.js';
import {CircularProgress, TextField} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import {showToast} from 'utils/toast';
import s from './Exchange.module.css';

import DokDropdown from 'components/DokDropdown';
import ModalAddCoins from 'components/ModalAddCoins';
import ModalAllowanceInfo from 'components/ModalAllowanceInfo';
import ModalPermitInfo from 'components/ModalPermitInfo';
import SwapCard from './components/SwapCard';
import FlipButton from './components/FlipButton';
import AmountChips from './components/AmountChips';
import CoinSelectorSheet from './components/CoinSelectorSheet';
import ProviderList from './components/ProviderList';
import SlippageEditor from './components/SlippageEditor';

import {
  selectCurrentWalletClientId,
  getCoinsOptions,
  selectVisibleWallets,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  getExchange,
  getExchangeApproveLoading,
  getExchangePermitApproveLoading,
  selectProviderRows,
  selectIsQuoteFetching,
  selectQuoteError,
  selectQuoteFetchedAt,
  selectLowestPairMinimum,
} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSelectors';
import {
  approveExchangePermit2,
  approveSwapAllowance,
  calculateExchange,
  estimateExchangeFee,
  fetchExchangeAllowance,
  fetchExchangePermitAllowance,
  fetchExchangeQuotes,
  fetchPairMinimums,
  refreshExchangeFromBalance,
  setExchangeFields,
} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';
import {
  getCustomizePublicAddress,
  isEVMChain,
  isSwapApprovalChain,
  multiplyBNWithFixed,
  swapNeedsApproval,
  validateNumber,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import {
  buildExchangePairKey,
  createDebounced,
  getSmartDefaultAmount,
} from 'dok-wallet-blockchain-networks/helper/exchangeHelpers';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {currencySymbol} from 'data/currency';
import {setCurrentTransferSuccess} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {getExchangeProviders} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProvidersSelectors';

const QUOTE_DEBOUNCE_MS = 700;

const Exchange = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const exchangeProvidersText = useSelector(getExchangeProviders);
  const coinOptions = useSelector(getCoinsOptions, shallowEqual);
  const allWallets = useSelector(selectVisibleWallets);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const {
    selectedCoinToOptions,
    selectedFromAsset,
    selectedCoinFromOptions,
    possibleFromCoin,
    selectedToAsset,
    possibleToCoins,
    amountFrom,
    amountTo,
    customOption,
    customAddress,
    selectedExchangeChain,
    slippage,
    lastQuotedAmount,
    selectedFromWallet,
    fromBalanceLoading,
  } = useSelector(getExchange);
  const providerRows = useSelector(selectProviderRows);
  const isQuoteFetching = useSelector(selectIsQuoteFetching);
  const quoteError = useSelector(selectQuoteError);
  const quoteFetchedAt = useSelector(selectQuoteFetchedAt);
  const lowestPairMinimum = useSelector(selectLowestPairMinimum);
  const exchangeApproveLoading = useSelector(getExchangeApproveLoading);
  const exchangePermitApproveLoading = useSelector(
    getExchangePermitApproveLoading,
  );
  const localCurrency = useSelector(getLocalCurrency);
  const fiatSymbol = currencySymbol[localCurrency] || '$';

  const [isPreparingAllowance, setIsPreparingAllowance] = useState(false);
  // Set on submit: from that moment the auto-refresh countdown is removed so
  // a background quote refresh can never rewrite the amounts/provider under
  // the approval modals or the Transfer screen. Cleared when the user edits
  // the form again.
  const [isQuoteLocked, setIsQuoteLocked] = useState(false);
  const [modalAddCoinsVisible, setModalAddCoinsVisible] = useState(false);
  const [allowanceModalVisible, setAllowanceModalVisible] = useState(false);
  const [permitModalVisible, setPermitModalVisible] = useState(false);

  const coinSelectorSheetRef = useRef();
  // Carries "this quote needs a permit2 approval too" across the allowance
  // modal, which resolves asynchronously after handleSubmit has returned.
  const permitRequiredRef = useRef(false);
  // Smart default is applied at most once per pair, and never over typed input.
  const defaultAppliedPairRef = useRef(null);
  const amountFromRef = useRef(amountFrom);
  amountFromRef.current = amountFrom;

  const pairKey = buildExchangePairKey(selectedFromAsset, selectedToAsset);

  const debouncedFetchQuotes = useMemo(
    () =>
      createDebounced(amount => {
        dispatch(fetchExchangeQuotes({amount}));
      }, QUOTE_DEBOUNCE_MS),
    [dispatch],
  );
  useEffect(() => () => debouncedFetchQuotes.cancel(), [debouncedFetchQuotes]);

  const handleAmountChange = useCallback(
    value => {
      const tempValues = validateNumberInInput(
        value,
        selectedFromAsset?.decimal,
      );
      dispatch(setExchangeFields({amountFrom: tempValues}));
      setIsQuoteLocked(false);
      debouncedFetchQuotes(tempValues);
    },
    [dispatch, debouncedFetchQuotes, selectedFromAsset?.decimal],
  );

  // Finds, per wallet, the matching coin for a picked option; mirrors the
  // wallet the current selection belongs to.
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
          possibleCoinDetails.push({
            label: `${tempWallet?.walletName}: ${getCustomizePublicAddress(
              tempAddress,
            )}`,
            value: tempAddress,
            options: {
              coinDetails: tempCoinDetails,
              walletDetails: tempWallet,
            },
          });
        }
      }
      if (!selectedCoinDetails?.symbol && possibleCoinDetails.length) {
        selectedCoinDetails = possibleCoinDetails[0].options.coinDetails;
        selectedWalletDetails = possibleCoinDetails[0].options.walletDetails;
      }
      return {selectedCoinDetails, possibleCoinDetails, selectedWalletDetails};
    },
    [allWallets, currentWalletClientId],
  );

  const onChangeFromValues = useCallback(
    item => {
      const {possibleCoinDetails, selectedCoinDetails, selectedWalletDetails} =
        getCoinDetails(item);
      dispatch(
        setExchangeFields({
          selectedCoinFromOptions: item,
          possibleFromCoin: possibleCoinDetails,
          selectedFromAsset: selectedCoinDetails,
          selectedFromWallet: selectedWalletDetails,
        }),
      );
    },
    [getCoinDetails, dispatch],
  );

  const onChangeToValues = useCallback(
    item => {
      const {possibleCoinDetails, selectedCoinDetails} = getCoinDetails(item);
      const customPayload = {
        label: 'Custom',
        value: 'Custom',
        options: {coinDetails: {}, walletDetails: {}},
      };
      dispatch(
        setExchangeFields({
          selectedCoinToOptions: item,
          possibleToCoins: [...possibleCoinDetails, customPayload],
          selectedToAsset: selectedCoinDetails,
        }),
      );
    },
    [dispatch, getCoinDetails],
  );

  const onSelectCoin = useCallback(
    (item, direction) => {
      if (direction === 'to') {
        onChangeToValues(item);
      } else {
        onChangeFromValues(item);
      }
    },
    [onChangeFromValues, onChangeToValues],
  );

  // Pair change: refresh provider minimums, and re-quote a kept amount.
  useEffect(() => {
    if (pairKey) {
      setIsQuoteLocked(false);
      dispatch(fetchPairMinimums());
      if (validateNumber(amountFromRef.current)) {
        debouncedFetchQuotes(amountFromRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairKey, dispatch]);

  // Smart default: once per pair, when the amount field is empty, pre-fill
  // roughly $100 of the from-coin (capped at balance) so most providers
  // clear their minimums.
  useEffect(() => {
    if (!pairKey || defaultAppliedPairRef.current === pairKey) {
      return;
    }
    if (validateNumber(amountFromRef.current)) {
      defaultAppliedPairRef.current = pairKey;
      return;
    }
    const defaultAmount = getSmartDefaultAmount({
      fromAsset: selectedFromAsset,
      lowestMinimum: lowestPairMinimum,
    });
    if (defaultAmount) {
      defaultAppliedPairRef.current = pairKey;
      handleAmountChange(defaultAmount);
    }
  }, [pairKey, lowestPairMinimum, selectedFromAsset, handleAmountChange]);

  // Re-derive wallet/balance data on mount (web pages unmount on navigation,
  // so mount is the equivalent of the mobile screen regaining focus — coins
  // can be added, balances refresh in the background).
  useEffect(() => {
    setIsQuoteLocked(false);
    if (selectedCoinToOptions) {
      onChangeToValues(selectedCoinToOptions);
    }
    if (selectedCoinFromOptions) {
      onChangeFromValues(selectedCoinFromOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the address dropdown lists in sync when the set of visible wallets
  // changes (e.g. coins added via ModalAddCoins, a hidden wallet revealed) —
  // on web this all happens in-page without a remount. Only the address
  // options are recomputed here; the selected asset/amount are left untouched.
  useEffect(() => {
    const updatedFields = {};
    if (selectedCoinFromOptions) {
      const {possibleCoinDetails} = getCoinDetails(selectedCoinFromOptions);
      updatedFields.possibleFromCoin = possibleCoinDetails;
    }
    if (selectedCoinToOptions) {
      const {possibleCoinDetails} = getCoinDetails(selectedCoinToOptions);
      updatedFields.possibleToCoins = [
        ...possibleCoinDetails,
        {
          label: 'Custom',
          value: 'Custom',
          options: {coinDetails: {}, walletDetails: {}},
        },
      ];
    }
    if (Object.keys(updatedFields).length) {
      dispatch(setExchangeFields(updatedFields));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWallets]);

  // Fetch a live balance whenever the from coin/address changes —
  // selectedFromAsset is a detached snapshot, so it must be re-synced from
  // the chain, not just re-copied from the store. The thunk's re-sync keeps
  // the same _id, so this effect doesn't loop.
  const fromAssetKey = `${selectedFromAsset?._id ?? ''}:${
    selectedFromWallet?.clientId ?? ''
  }`;
  useEffect(() => {
    if (selectedFromAsset?._id) {
      dispatch(refreshExchangeFromBalance());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAssetKey]);

  const onSelectFromAsset = useCallback(
    event => {
      const value = event?.target?.value;
      const item = possibleFromCoin?.find(subItem => subItem.value === value);
      if (!item) {
        return;
      }
      dispatch(
        setExchangeFields({
          selectedFromAsset: item.options?.coinDetails,
          selectedFromWallet: item.options?.walletDetails,
        }),
      );
    },
    [dispatch, possibleFromCoin],
  );

  const onSelectToAsset = useCallback(
    event => {
      const value = event?.target?.value;
      const item = possibleToCoins?.find(subItem => subItem.value === value);
      if (!item) {
        return;
      }
      if (item.value === 'Custom') {
        dispatch(setExchangeFields({customOption: item.value}));
      } else {
        dispatch(
          setExchangeFields({
            selectedToAsset: item.options?.coinDetails,
            customOption: '',
          }),
        );
      }
    },
    [dispatch, possibleToCoins],
  );

  const onFlip = useCallback(() => {
    const fromOption = structuredClone(selectedCoinToOptions);
    const toOption = structuredClone(selectedCoinFromOptions);
    const newAmountFrom = validateNumber(amountTo) ? `${amountTo}` : '';
    if (fromOption) {
      onChangeFromValues(fromOption);
    }
    if (toOption) {
      onChangeToValues(toOption);
    }
    dispatch(
      setExchangeFields({
        amountFrom: newAmountFrom,
        amountTo: '',
        customOption: '',
        customAddress: '',
      }),
    );
    setIsQuoteLocked(false);
    if (newAmountFrom) {
      debouncedFetchQuotes(newAmountFrom);
    }
  }, [
    dispatch,
    amountTo,
    selectedCoinFromOptions,
    selectedCoinToOptions,
    onChangeFromValues,
    onChangeToValues,
    debouncedFetchQuotes,
  ]);

  const onSelectFraction = useCallback(
    fraction => {
      const balance = new BigNumber(selectedFromAsset?.totalAmount ?? NaN);
      if (!balance.isFinite() || balance.lte(0)) {
        return;
      }
      const decimals = Math.min(Number(selectedFromAsset?.decimal) || 8, 8);
      const amount = balance
        .multipliedBy(fraction)
        .decimalPlaces(decimals, BigNumber.ROUND_DOWN)
        .toFixed();
      handleAmountChange(amount);
    },
    [
      handleAmountChange,
      selectedFromAsset?.totalAmount,
      selectedFromAsset?.decimal,
    ],
  );

  const onPressProvider = useCallback(
    row => {
      const quote = row?.quote;
      if (!quote?.toAmount) {
        return;
      }
      dispatch(
        setExchangeFields({
          selectedExchangeChain: quote,
          extraData: quote?.extraData,
          amountTo: quote.toAmount + '',
          isProviderManuallySelected: true,
        }),
      );
    },
    [dispatch],
  );

  const onCommitSlippage = useCallback(
    value => {
      dispatch(setExchangeFields({slippage: value}));
      if (validateNumber(amountFromRef.current)) {
        dispatch(fetchExchangeQuotes({amount: amountFromRef.current}));
      }
    },
    [dispatch],
  );

  const onRefreshQuotes = useCallback(() => {
    if (validateNumber(amountFromRef.current)) {
      dispatch(fetchExchangeQuotes({amount: amountFromRef.current}));
    }
  }, [dispatch]);

  // ---- Validation ----------------------------------------------------
  const minimumValue = selectedExchangeChain?.minAmount || null;
  const backendSlippage = selectedExchangeChain?.extraData?.slippage;
  const amountFromBN = new BigNumber(amountFrom || NaN);
  const isMinimumValueGreater = !!(
    minimumValue &&
    amountFromBN.isFinite() &&
    new BigNumber(minimumValue).gt(amountFromBN)
  );
  const isBalanceLess =
    amountFromBN.isFinite() &&
    new BigNumber(selectedFromAsset?.totalAmount ?? 0).lt(amountFromBN);
  const isCustomAddressRequire = customOption === 'Custom' && !customAddress;

  const balanceDisplay = validateNumber(selectedFromAsset?.totalAmount)
    ? new BigNumber(selectedFromAsset?.totalAmount)
        .decimalPlaces(6, BigNumber.ROUND_DOWN)
        .toFixed()
    : '0';
  const balanceText = selectedFromAsset?.symbol
    ? `Balance: ${balanceDisplay} ${selectedFromAsset?.symbol?.toUpperCase()}`
    : '';

  // Typing sits in a debounce window before the quote request even starts;
  // until the shown quote matches the entered amount, submitting would send
  // a rateId/provider that belongs to the previous amount.
  const isQuoteStaleForAmount = amountFrom !== lastQuotedAmount;

  const isButtonDisabled =
    !validateNumber(amountFrom) ||
    !validateNumber(amountTo) ||
    !selectedExchangeChain ||
    isMinimumValueGreater ||
    isBalanceLess ||
    isCustomAddressRequire ||
    isQuoteFetching ||
    isQuoteStaleForAmount ||
    !!quoteError;

  // Permit2 exists only on EVM; the allowance (approve) flow covers both
  // EVM ERC20 and Tron TRC20 sources. Solana never needs approval — the
  // whole route is bundled into the transaction the wallet signs.
  const isERC20FromAsset =
    isEVMChain(selectedFromAsset?.chain_name) &&
    !!selectedFromAsset?.contractAddress;
  const isSwapApprovalAsset =
    isSwapApprovalChain(selectedFromAsset?.chain_name) &&
    !!selectedFromAsset?.contractAddress;
  const showApproveAndSwap = isSwapApprovalAsset && !isButtonDisabled;

  // Why the CTA is disabled, in the order the user should resolve things.
  // `transient` renders neutral (a wait state), everything else as an error.
  let disabledReason = null;
  if (isButtonDisabled && !isPreparingAllowance) {
    const fromSymbolText = selectedFromAsset?.symbol?.toUpperCase() || '';
    if (!selectedFromAsset?.symbol || !selectedToAsset?.symbol) {
      disabledReason = {text: 'Select the coins you want to swap.'};
    } else if (!validateNumber(amountFrom)) {
      disabledReason = {text: 'Enter an amount to swap.'};
    } else if (isBalanceLess) {
      disabledReason = {
        text: `You don't have enough ${fromSymbolText}. Your balance is ${balanceDisplay} ${fromSymbolText}.`,
      };
    } else if (isMinimumValueGreater) {
      disabledReason = {
        text: `Minimum for ${
          selectedExchangeChain?.title || 'this provider'
        } is ${minimumValue} ${fromSymbolText}.`,
      };
    } else if (isCustomAddressRequire) {
      disabledReason = {
        text: 'Enter the address that will receive the funds.',
      };
    } else if (isQuoteFetching || isQuoteStaleForAmount) {
      disabledReason = {text: 'Fetching the latest quote…', transient: true};
    } else if (quoteError) {
      disabledReason = {
        text: "Quotes couldn't be fetched. Tap Retry in the providers list.",
      };
    } else if (!selectedExchangeChain || !validateNumber(amountTo)) {
      disabledReason = {
        text: "No provider can swap this amount. Check each provider's minimum in the list.",
      };
    }
  }

  // ---- Approval / submit flow --------------------------------------------
  // Every path converges here once approvals are settled: fire the fee
  // estimate WITHOUT awaiting it and navigate immediately. The estimate's
  // first synchronous action puts currentTransfer into loading, so Transfer
  // mounts on its spinner and resolves to the form (or the error view, e.g.
  // when the quote expired while the user idled) when the estimate lands.
  const finishToTransfer = useCallback(() => {
    dispatch(estimateExchangeFee());
    dispatch(
      setRouteStateData({
        transfer: {
          fromScreen: 'Exchange',
        },
      }),
    );
    router.push('/swap/confirm');
  }, [dispatch, router]);

  // After the ERC20-level allowance is confirmed (already approved, or just
  // approved via the allowance modal), a permit2 swap quote still needs a
  // separate router-level (Permit2) allowance before it's safe to swap.
  // needsPermit is read off the quote we just fetched rather than off state,
  // so it can't lag behind the provider the user actually picked.
  const handlePermitCheckAndProceed = useCallback(
    async needsPermit => {
      if (!needsPermit) {
        finishToTransfer();
        return;
      }
      const permitResult = await dispatch(
        fetchExchangePermitAllowance(),
      ).unwrap();
      if (permitResult?.isApproved) {
        finishToTransfer();
      } else {
        setPermitModalVisible(true);
      }
    },
    [dispatch, finishToTransfer],
  );

  const handleSubmit = async () => {
    setIsQuoteLocked(true);
    dispatch(setCurrentTransferSuccess(false));
    setIsPreparingAllowance(true);
    try {
      // Always await the create before navigating: the Transfer screen's fee
      // estimation and send path dispatch on currentTransfer.swapData, so
      // navigating early would race a DEX quote into a plain transfer.
      const quote = await dispatch(calculateExchange()).unwrap();
      if (!quote) {
        // Fulfilled without data (e.g. empty backend response): navigating
        // would show the Transfer screen against stale transfer state.
        showToast({
          type: 'errorToast',
          title: 'Failed to create the exchange. Please try again.',
        });
        return;
      }
      // Whether an approval is actually needed depends on the quote: only a
      // DEX aggregator returns swapData with a spender, and only token
      // sources on approval chains (ERC20/TRC20) have an allowance at all.
      // Deposit-address providers and Solana swaps go straight through.
      if (
        !swapNeedsApproval({
          swapData: quote?.swapData,
          asset: selectedFromAsset,
        })
      ) {
        finishToTransfer();
        return;
      }
      const needsPermit = Boolean(quote?.swapData?.permit_abi);
      const result = await dispatch(fetchExchangeAllowance()).unwrap();
      if (result?.isApproved) {
        await handlePermitCheckAndProceed(needsPermit);
      } else {
        permitRequiredRef.current = needsPermit;
        setAllowanceModalVisible(true);
      }
    } catch (error) {
      console.error('Error preparing swap allowance', error);
      // calculateExchange rejects with rejectWithValue, so unwrap() throws
      // the plain string payload rather than an Error object.
      showToast({
        type: 'errorToast',
        title:
          (typeof error === 'string' ? error : error?.message) ||
          'Failed to prepare the exchange',
      });
    } finally {
      setIsPreparingAllowance(false);
    }
  };

  // Both modals emit the same {type, gasFee, maxPriorityFeePerGas, nonce,
  // feesType, estimateGas} payload, so it passes straight through to the
  // approve thunk — the handlers differ only in thunk, modal and next step.
  const onAllowanceContinue = useCallback(
    async approvalPayload => {
      try {
        await dispatch(approveSwapAllowance(approvalPayload)).unwrap();
        setAllowanceModalVisible(false);
        await handlePermitCheckAndProceed(permitRequiredRef.current);
      } catch (error) {
        // approveSwapAllowance toasts its own failures; permit-allowance
        // read errors land here and are visible in the console.
        console.error('Error approving swap allowance', error);
      }
    },
    [dispatch, handlePermitCheckAndProceed],
  );

  const onPermitAllowanceContinue = useCallback(
    async approvalPayload => {
      try {
        await dispatch(approveExchangePermit2(approvalPayload)).unwrap();
        setPermitModalVisible(false);
        finishToTransfer();
      } catch (error) {
        console.error('Error approving permit2 allowance', error);
      }
    },
    [dispatch, finishToTransfer],
  );

  const refreshPaused =
    isPreparingAllowance ||
    exchangeApproveLoading ||
    exchangePermitApproveLoading ||
    allowanceModalVisible ||
    permitModalVisible;

  return (
    <div className={s.container}>
      <div className={s.headerRow}>
        <h3 className={s.pageTitle}>Swap</h3>
        <button
          type='button'
          className={s.historyButton}
          onClick={() => router.push('/swap/history')}
          aria-label='Swap history'>
          <AccessTimeIcon
            sx={{fontSize: 24, color: 'var(--borderActiveColor)'}}
          />
        </button>
      </div>
      <SwapCard
        label='You pay'
        coinOption={selectedCoinFromOptions}
        amount={amountFrom}
        fiatValue={
          validateNumber(amountFrom) && selectedFromAsset?.currencyRate
            ? `~${fiatSymbol}${multiplyBNWithFixed(
                amountFrom,
                selectedFromAsset?.currencyRate,
                2,
              )}`
            : ''
        }
        balanceText={balanceText}
        isBalanceFetching={fromBalanceLoading}
        editable={true}
        onChangeAmount={handleAmountChange}
        onPressCoin={() => coinSelectorSheetRef.current?.present('from')}
        hasError={isBalanceLess}>
        {new BigNumber(selectedFromAsset?.totalAmount ?? 0).gt(0) && (
          <AmountChips
            onSelectFraction={onSelectFraction}
            disabled={fromBalanceLoading}
          />
        )}
      </SwapCard>
      <FlipButton onPress={onFlip} />
      <SwapCard
        label='You receive (estimated)'
        coinOption={selectedCoinToOptions}
        amount={validateNumber(amountTo) ? `${amountTo}` : ''}
        fiatValue={
          validateNumber(amountTo) && selectedToAsset?.currencyRate
            ? `~${fiatSymbol}${multiplyBNWithFixed(
                amountTo,
                selectedToAsset?.currencyRate,
                2,
              )}`
            : ''
        }
        editable={false}
        onPressCoin={() => coinSelectorSheetRef.current?.present('to')}
        isFetching={isQuoteFetching}
      />
      {isMinimumValueGreater && (
        <p className={s.errorText}>
          {`Minimum for ${
            selectedExchangeChain?.title || 'this provider'
          } is ${minimumValue} ${selectedFromAsset?.symbol || ''}`}
        </p>
      )}
      {isBalanceLess && (
        <p className={s.errorText}>
          {`You don't have ${amountFrom} ${selectedFromAsset?.symbol || ''}`}
        </p>
      )}
      {!!possibleFromCoin?.length && (
        <div className={s.addressView}>
          <h3 className={s.addressTitle}>Pay from address</h3>
          <DokDropdown
            key={selectedFromAsset?.address}
            placeholder={'Pay from address'}
            listData={possibleFromCoin}
            onValueChange={onSelectFromAsset}
            value={selectedFromAsset?.address}
          />
        </div>
      )}
      {!!possibleToCoins?.length && (
        <div className={s.addressView}>
          <h3 className={s.addressTitle}>Receive to address</h3>
          <DokDropdown
            key={customOption || selectedToAsset?.address}
            placeholder={'Receive to address'}
            listData={possibleToCoins}
            onValueChange={onSelectToAsset}
            value={customOption || selectedToAsset?.address}
          />
        </div>
      )}
      {customOption === 'Custom' && (
        <TextField
          style={{width: '100%', marginTop: 14}}
          label='To Address'
          placeholder={'Enter to address'}
          sx={{
            '& fieldset': {
              borderColor: 'var(--whiteOutline) !important',
            },
            '& .MuiInputBase-input': {
              color: 'var(--font)',
            },
          }}
          name='To Address'
          autoFocus={true}
          onChange={event => {
            dispatch(setExchangeFields({customAddress: event?.target.value}));
          }}
          value={customAddress}
          slotProps={{
            inputLabel: {style: {color: 'var(--sidebarIcon)'}},
          }}
        />
      )}
      <p className={s.addCoinText}>
        {'Looking for more coins?'}
        <span
          className={s.addCoinLink}
          onClick={() => setModalAddCoinsVisible(true)}>
          {' Add coins to this wallet'}
        </span>
      </p>
      {!!selectedExchangeChain &&
        (backendSlippage !== undefined && backendSlippage !== null
          ? true
          : !!slippage) && (
          <div className={s.detailsCard}>
            <SlippageEditor
              slippage={slippage}
              backendSlippage={backendSlippage}
              onCommit={onCommitSlippage}
            />
          </div>
        )}
      <ProviderList
        rows={providerRows}
        isFetching={isQuoteFetching}
        error={quoteError}
        onRetry={onRefreshQuotes}
        onPressProvider={onPressProvider}
        fromSymbol={selectedFromAsset?.symbol?.toUpperCase()}
        toSymbol={selectedToAsset?.symbol?.toUpperCase()}
        fiatSymbol={fiatSymbol}
        quoteFetchedAt={isQuoteLocked ? null : quoteFetchedAt}
        refreshPaused={refreshPaused}
        onRefresh={onRefreshQuotes}
      />
      <div className={s.boxFooter}>
        <p className={s.footerText}>
          {`Swap services are available through third-party API provider (${exchangeProvidersText}).`}
        </p>
        {customOption === 'Custom' && (
          <p className={s.warningText}>
            {'Please ensure the custom wallet address before exchanging.'}
          </p>
        )}
        {!!disabledReason && (
          <p
            className={
              disabledReason.transient ? s.buttonHintInfo : s.buttonHintError
            }>
            {disabledReason.text}
          </p>
        )}
        <button
          type='button'
          className={s.button}
          style={{
            backgroundColor:
              isButtonDisabled || isPreparingAllowance
                ? 'var(--disabledButton)'
                : 'var(--background)',
          }}
          onClick={handleSubmit}
          disabled={isButtonDisabled || isPreparingAllowance}>
          {isPreparingAllowance ? (
            <CircularProgress size={20} sx={{color: 'var(--title)'}} />
          ) : (
            <p className={s.buttonTitle}>
              {showApproveAndSwap ? 'Approve and swap' : 'Next'}
            </p>
          )}
        </button>
      </div>
      <CoinSelectorSheet
        ref={coinSelectorSheetRef}
        options={coinOptions}
        onSelect={onSelectCoin}
      />
      {modalAddCoinsVisible && (
        <ModalAddCoins
          visible={modalAddCoinsVisible}
          hideModal={setModalAddCoinsVisible}
        />
      )}
      {isSwapApprovalAsset && (
        <ModalAllowanceInfo
          visible={allowanceModalVisible}
          onClose={() => setAllowanceModalVisible(false)}
          source='exchange'
          tokenSymbol={selectedFromAsset?.symbol}
          requiredAmount={amountFrom}
          availableAmount={selectedFromAsset?.totalAmount}
          chainName={selectedFromAsset?.chain_name}
          chainSymbol={selectedFromAsset?.chain_symbol}
          approveLoading={exchangeApproveLoading}
          onContinue={onAllowanceContinue}
        />
      )}
      {isERC20FromAsset && (
        <ModalPermitInfo
          visible={permitModalVisible}
          onClose={() => setPermitModalVisible(false)}
          tokenSymbol={selectedFromAsset?.symbol}
          requiredAmount={amountFrom}
          availableAmount={selectedFromAsset?.totalAmount}
          chainName={selectedFromAsset?.chain_name}
          chainSymbol={selectedFromAsset?.chain_symbol}
          approveLoading={exchangePermitApproveLoading}
          onContinue={onPermitAllowanceContinue}
        />
      )}
    </div>
  );
};

export default Exchange;
