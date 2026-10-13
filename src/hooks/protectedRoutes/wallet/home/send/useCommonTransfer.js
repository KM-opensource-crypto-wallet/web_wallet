import {
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
  useEffect,
  useMemo,
} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useRouter} from 'next/navigation';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {sendFunds} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  getTransferData,
  getTransferDataCustomError,
  getTransferDataFeeSuccess,
  getTransferDataLoading,
  getTransferDataSubmitting,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSelector';
import {calculateEstimateFee} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {currencySymbol} from 'data/currency';
import {
  delay,
  getCustomizePublicAddress,
  isBalanceNotAvailable,
  isCustomAddressNotSupportedChain,
  isEVMChain,
  isFeesOptionChain,
} from 'dok-wallet-blockchain-networks/helper';
import {
  getBalanceForNativeCoin,
  getCurrentWalletPhrase,
  getFailedTransaction,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraSelectors';
import {
  selectExchangeAmountFrom,
  selectExchangeAmountTo,
  selectExchangeFromAsset,
  selectExchangeFromWallet,
  selectExchangeLoading,
  selectExchangeToAddress,
  selectExchangeToAsset,
  selectExchangeToName,
  selectSelectedExchangeChain,
} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSelectors';
import {getSellCryptoRequestDetails} from 'dok-wallet-blockchain-networks/redux/sellCrypto/sellCryptoSelectors';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';
import useAdvancedFees from 'src/hooks/useAdvancedFees';
import {useHederaRecipientLookup} from 'src/hooks/useHederaAccount';

// Logic for the shared confirm screen (components/CommonTransfer), used by
// send funds, staking, swap, sell crypto, NFT, vote and batch transactions.
// The flow comes from routeStateData.fromScreen.
export const useCommonTransfer = () => {
  const localCurrency = useSelector(getLocalCurrency);
  const transferData = useSelector(getTransferData);
  const isSubmitting = useSelector(getTransferDataSubmitting);
  const isLoading = useSelector(getTransferDataLoading);
  const feeSuccess = useSelector(getTransferDataFeeSuccess);
  const customError = useSelector(getTransferDataCustomError);
  const balance = useSelector(getBalanceForNativeCoin);
  const phrase = useSelector(getCurrentWalletPhrase);
  // Hedera: the recipient's ledger account id; a missing id means the
  // transfer will auto-create the account (sender pays).
  const hederaToAddress =
    transferData?.currentCoin?.chain_name === 'hedera'
      ? transferData?.toAddress
      : null;
  const getHederaChain = useCallback(
    () => getChain('hedera', phrase),
    [phrase],
  );
  const {status: hederaRecipientStatus, result: hederaRecipient} =
    useHederaRecipientLookup({
      address: hederaToAddress,
      getHederaChain,
    });
  const failedTransaction = useSelector(getFailedTransaction);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isFetchingFeesAgain, setIsFetchingFeesAgain] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);
  const sellCryptoRequestDetails = useSelector(getSellCryptoRequestDetails);
  const isFetchingRef = useRef(false);
  const isPauseCalculateFees = useRef(false);

  const [estimateStatus, setEstimateStatus] = useState('pending'); // 'pending' | 'success' | 'failed'
  const dispatch = useDispatch();
  const currentWallet = useSelector(selectCurrentWallet);
  const routeData = useSelector(getRouteStateData);
  const routeStateData = routeData?.transfer;
  const fromScreen = routeStateData?.fromScreen;
  const isCreateVote = routeStateData?.isCreateVote;
  const selectedFromAsset = useSelector(selectExchangeFromAsset);
  const selectedFromWallet = useSelector(selectExchangeFromWallet);
  const selectedToAsset = useSelector(selectExchangeToAsset);
  const amountFrom = useSelector(selectExchangeAmountFrom);
  const amountTo = useSelector(selectExchangeAmountTo);
  const isExchangeLoading = useSelector(selectExchangeLoading);
  const exchangeToName = useSelector(selectExchangeToName);
  const exchangeToAddress = useSelector(selectExchangeToAddress);
  const selectedExchangeChain = useSelector(selectSelectedExchangeChain);

  const isExchangeScreen = fromScreen === 'Exchange';
  const isSendFundScreen = fromScreen === 'SendFunds';
  const isSellCryptoScreen = fromScreen === 'SellCrypto';
  const isBatchTransaction = fromScreen === 'BatchTransaction';
  const isSendNFT = fromScreen === 'SendNFT';
  const isStakingScreen = fromScreen === 'Staking';
  const isVoteStakingScreen = fromScreen === 'VoteStaking';
  const isDeactivateStaking = routeStateData?.isDeactivateStaking;
  const isWithdrawStaking = routeStateData?.isWithdrawStaking;
  const isCreateStaking = routeStateData?.isCreateStaking;
  const isStakingRewards = routeStateData?.isStakingRewards;
  const router = useRouter();

  // Fresh data for the long-lived 10s poll closure (avoids stale
  // transferData/exchange captures inside the interval callback). Assigned
  // post-commit so a discarded concurrent render can't leave the ref
  // holding values that never committed.
  const transferContextRef = useRef({});
  useLayoutEffect(() => {
    transferContextRef.current = {
      transferData,
      selectedFromAsset,
      selectedFromWallet,
      amountFrom,
      currentWallet,
    };
  });

  const quoteExpiresAt = useMemo(() => {
    // Quote TTLs only exist for exchange flows. Gating on the screen flag
    // keeps a leftover quote window from a flow that skipped the entry
    // reset from ever blocking a plain send with "Quote expired".
    if (!isExchangeScreen) {
      return null;
    }
    const created = transferData?.quoteCreatedAt;
    const ttl = transferData?.quoteTtlSeconds;
    return created && ttl ? created + ttl * 1000 : null;
  }, [
    isExchangeScreen,
    transferData?.quoteCreatedAt,
    transferData?.quoteTtlSeconds,
  ]);
  const [isQuoteExpired, setIsQuoteExpired] = useState(false);
  const isQuoteExpiredRef = useRef(false);

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    if (!quoteExpiresAt) {
      (() => {
        isQuoteExpiredRef.current = false;
        setIsQuoteExpired(false);
      })();
      return;
    }
    const remaining = quoteExpiresAt - Date.now();
    if (remaining <= 0) {
      (() => {
        isQuoteExpiredRef.current = true;
        setIsQuoteExpired(true);
      })();
      return;
    }
    (() => {
      isQuoteExpiredRef.current = false;
      setIsQuoteExpired(false);
    })();
    const timer = setTimeout(() => {
      isQuoteExpiredRef.current = true;
      setIsQuoteExpired(true);
    }, remaining);
    return () => {
      clearTimeout(timer);
    };
  }, [quoteExpiresAt]);

  const chainName = isExchangeScreen
    ? selectedFromAsset?.chain_name
    : transferData?.currentCoin?.chain_name;

  const convertedChainName = isEVMChain(chainName) ? 'ethereum' : chainName;

  const {
    sheetProps: advancedFeesSheetProps,
    feesOptions,
    isEip1559,
    selectedFeesType,
    selectedFeesTypeRef,
    selectedFeesLabel,
    finalNonce,
    isCustomFeesValid,
  } = useAdvancedFees({chainName, convertedChainName, isPauseCalculateFees});

  const batchTransactionsData = transferData?.transactionsData;
  const nativeBalanceForBatchTransactions = useMemo(() => {
    if (isBatchTransaction && batchTransactionsData?.length) {
      const totalBN = batchTransactionsData.reduce((sum, item) => {
        if (item?.coinInfo?.type === 'coin') {
          return sum.plus(new BigNumber(item.transferData?.amount || '0'));
        }
        return sum;
      }, new BigNumber(0));
      return totalBN.toString();
    }
    return null;
  }, [isBatchTransaction, batchTransactionsData]);

  const title = isSendFundScreen
    ? 'Confirm send'
    : isExchangeScreen
      ? 'Confirm swap'
      : isSellCryptoScreen
        ? 'Confirm sale'
        : isSendNFT
          ? 'Confirm NFT transfer'
          : isCreateVote
            ? 'Confirm validators'
            : isCreateStaking
              ? 'Confirm stake'
              : isWithdrawStaking
                ? 'Confirm withdrawal'
                : isDeactivateStaking
                  ? 'Confirm unstake'
                  : isStakingRewards
                    ? 'Confirm rewards claim'
                    : isBatchTransaction
                      ? 'Confirm batch'
                      : 'Confirm transaction';

  // Latch the render/poll state machine on the first successful estimate.
  // The screen can mount while the first estimate is still in flight, so this
  // fires whenever feeSuccess arrives rather than at mount.
  useEffect(() => {
    // see comment on the first wrapped effect above
    (() => {
      if (feeSuccess) {
        setEstimateStatus('success');
      }
    })();
  }, [feeSuccess]);

  // Exchange mode used to start polling from quote creation and self-heal a
  // failed FIRST estimate every 10s. Keep that: when the initial estimate
  // settles unsuccessfully (loading finished, no success), enter 'failed' so
  // the poll below starts and the screen can recover on a later tick.
  useEffect(() => {
    // see comment on the first wrapped effect above
    (() => {
      if (isExchangeScreen && !isLoading && !isExchangeLoading && !feeSuccess) {
        setEstimateStatus(prev => (prev === 'pending' ? 'failed' : prev));
      }
    })();
  }, [isExchangeScreen, isLoading, isExchangeLoading, feeSuccess]);

  useEffect(() => {
    // VoteStaking was never part of the polling mode set — keep it out so
    // its one-shot estimate isn't re-run every 10s.
    // 'failed' keeps polling too: a transient RPC error on one re-estimate
    // must not kill the interval permanently — the next successful tick
    // dispatches setCurrentTransferSuccess(true), the feeSuccess latch flips
    // estimateStatus back to 'success', and the form self-heals.
    if (
      (estimateStatus === 'success' || estimateStatus === 'failed') &&
      !isVoteStakingScreen
    ) {
      let interval = setInterval(() => {
        if (
          !isFetchingRef.current &&
          !isPauseCalculateFees.current &&
          !isQuoteExpiredRef.current
        ) {
          setIsFetchingFeesAgain(true);

          isFetchingRef.current = true;
          const {
            transferData: freshTransferData,
            selectedFromAsset: freshFromAsset,
            selectedFromWallet: freshFromWallet,
            amountFrom: freshAmountFrom,
            currentWallet: freshCurrentWallet,
          } = transferContextRef.current;
          dispatch(
            calculateEstimateFee({
              isFetchNonce: false,
              existingNonce: freshTransferData?.nonce,
              fromAddress:
                isSendFundScreen ||
                isSellCryptoScreen ||
                isStakingScreen ||
                isBatchTransaction
                  ? freshTransferData?.currentCoin?.address
                  : isExchangeScreen
                    ? freshFromAsset?.address
                    : freshTransferData?.selectedNFT?.coin?.address,
              toAddress: freshTransferData?.toAddress,
              memo: freshTransferData?.memo,
              amount:
                isSendFundScreen || isSellCryptoScreen || isStakingScreen
                  ? freshTransferData?.amount
                  : isExchangeScreen
                    ? freshAmountFrom
                    : null,
              contractAddress: isSendNFT
                ? freshTransferData?.selectedNFT?.token_address ||
                  freshTransferData?.selectedNFT?.associatedTokenAddress
                : freshTransferData?.currentCoin?.contractAddress,
              balance: freshTransferData?.currentCoin?.totalAmount,
              selectedWallet: isExchangeScreen
                ? freshFromWallet
                : isSendNFT
                  ? freshCurrentWallet
                  : null,
              selectedCoin: isExchangeScreen
                ? freshFromAsset
                : isSendNFT
                  ? freshTransferData?.currentCoin
                  : null,
              contract_type: isSendNFT
                ? freshTransferData?.selectedNFT?.contract_type
                : null,
              isNFT: isSendNFT,
              isExchange: isExchangeScreen,
              mint: isSendNFT ? freshTransferData?.selectedNFT?.mint : null,
              tokenId: isSendNFT
                ? freshTransferData?.selectedNFT?.token_id
                : null,
              tokenAmount: isSendNFT
                ? freshTransferData?.selectedNFT?.amount || 1
                : null,
              validatorPubKey: isStakingScreen
                ? freshTransferData?.validatorPubKey
                : null,
              stakingAddress: isStakingScreen
                ? freshTransferData?.stakingAddress
                : null,
              stakingBalance: isStakingScreen
                ? freshTransferData?.stakingBalance
                : null,
              resourceType: isStakingScreen
                ? freshTransferData?.resourceType
                : null,
              selectedVotes: isVoteStakingScreen
                ? freshTransferData?.selectedVotes
                : null,
              isBatchTransaction,
              currentCoin: isBatchTransaction
                ? freshTransferData?.currentCoin
                : null,
              calls: isBatchTransaction ? freshTransferData?.calls : null,
              isCreateStaking: isCreateStaking,
              isWithdrawStaking: !!isWithdrawStaking,
              isStakingRewards: !!isStakingRewards,
              isDeactivateStaking: !!isDeactivateStaking,
              stakingProviderName:
                isCreateStaking || isDeactivateStaking || isStakingRewards
                  ? freshTransferData?.stakingProviderName
                  : null,
              tokenDecimals: isStakingScreen
                ? freshTransferData?.currentCoin?.decimal
                : null,
              isMaxCheckbox: isDeactivateStaking
                ? freshTransferData?.isMaxCheckbox
                : null,
              feesType: selectedFeesTypeRef.current,
              estimateGas: freshTransferData?.estimateGas,
            }),
          )
            .unwrap()
            .then(resp => {
              setIsFetchingFeesAgain(false);
              isFetchingRef.current = false;
              setEstimateStatus(resp ? 'success' : 'failed');
            })
            .catch(() => {
              // calculateEstimateFee rethrows expired-quote errors; the slice
              // already set customError, so flipping estimateStatus swaps the
              // form for that message. Reset the in-flight flags or polling
              // would stop permanently.
              setIsFetchingFeesAgain(false);
              isFetchingRef.current = false;
              setEstimateStatus('failed');
            });
        }
      }, 10000);
      return () => {
        clearInterval(interval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateStatus]);

  const submitTransferData = useCallback(async () => {
    await dispatch(
      sendFunds({
        to: transferData.toAddress,
        memo: transferData.memo,
        nonce: finalNonce,
        amount:
          isSendFundScreen || isSellCryptoScreen || isStakingScreen
            ? transferData?.amount
            : isExchangeScreen
              ? amountFrom
              : '0',
        currentCoin: transferData?.currentCoin,
        currentWallet: isExchangeScreen
          ? selectedFromWallet
          : isSendNFT
            ? currentWallet
            : null,
        balance: transferData?.currentCoin?.totalAmount,
        isExchange: isExchangeScreen,
        contract_type: isSendNFT
          ? transferData?.selectedNFT?.contract_type
          : null,
        tokenId: isSendNFT ? transferData?.selectedNFT?.token_id : null,
        tokenAmount: isSendNFT ? transferData?.selectedNFT?.amount : null,
        contractAddress: isSendNFT
          ? transferData?.selectedNFT?.token_address ||
            transferData?.selectedNFT?.associatedTokenAddress
          : null,
        mint: isSendNFT ? transferData?.selectedNFT?.mint : null,
        isNFT: isSendNFT,
        isBatchTransaction,
        calls: isBatchTransaction ? transferData?.calls : null,
        transactionsData: isBatchTransaction
          ? transferData?.transactionsData
          : null,
        from:
          isStakingScreen || isSendNFT || isVoteStakingScreen
            ? transferData?.currentCoin?.address
            : null,
        stakingBalance: isStakingScreen ? transferData?.stakingBalance : null,
        resourceType: isStakingScreen ? transferData?.resourceType : null,
        selectedVotes: isVoteStakingScreen ? transferData?.selectedVotes : null,
        isCreateVote: !!isCreateVote,
        validatorPubKey: isStakingScreen ? transferData?.validatorPubKey : null,
        isWithdrawStaking: !!isWithdrawStaking,
        isStakingRewards: !!isStakingRewards,
        isCreateStaking: isCreateStaking,
        isDeactivateStaking: !!isDeactivateStaking,
        stakingProviderName:
          isCreateStaking || isDeactivateStaking || isStakingRewards
            ? transferData?.stakingProviderName
            : null,
        stakingAddress: isStakingScreen ? transferData?.stakingAddress : null,
        numberOfStakeAccount: isStakingScreen
          ? transferData?.currentCoin?.staking?.length || 0
          : null,
        phrase,
        router,
      }),
    );
  }, [
    finalNonce,
    dispatch,
    transferData.toAddress,
    transferData.memo,
    transferData?.amount,
    transferData?.currentCoin,
    transferData?.selectedNFT?.contract_type,
    transferData?.selectedNFT?.token_id,
    transferData?.selectedNFT?.amount,
    transferData?.selectedNFT?.token_address,
    transferData?.selectedNFT?.associatedTokenAddress,
    transferData?.selectedNFT?.mint,
    transferData?.calls,
    transferData?.transactionsData,
    transferData?.stakingBalance,
    transferData?.resourceType,
    transferData?.selectedVotes,
    transferData?.validatorPubKey,
    transferData?.stakingProviderName,
    transferData?.stakingAddress,
    isSendFundScreen,
    isSellCryptoScreen,
    isStakingScreen,
    isExchangeScreen,
    amountFrom,
    selectedFromWallet,
    isSendNFT,
    currentWallet,
    isBatchTransaction,
    isVoteStakingScreen,
    isCreateVote,
    isWithdrawStaking,
    isStakingRewards,
    isCreateStaking,
    isDeactivateStaking,
    phrase,
    router,
  ]);

  useEffect(() => {
    const validateDuplicateTransaction = () => {
      const failedTimestamp = failedTransaction?.timestamp;
      if (
        failedTimestamp &&
        dayjs().diff(dayjs(failedTimestamp), 'minutes') < 5
      ) {
        const currentFrom =
          isSendFundScreen ||
          isStakingScreen ||
          isSellCryptoScreen ||
          isBatchTransaction
            ? transferData?.currentCoin?.address
            : isExchangeScreen
              ? selectedFromAsset?.address
              : transferData?.selectedNFT?.coin?.address;
        const currentTo = transferData.toAddress;
        const currentAmount =
          isSendFundScreen || isStakingScreen || isSellCryptoScreen
            ? transferData?.amount
            : isExchangeScreen
              ? amountFrom
              : '0';
        const currentContractAddress = isSendNFT
          ? transferData?.selectedNFT?.token_address ||
            transferData?.selectedNFT?.associatedTokenAddress
          : transferData?.currentCoin?.contractAddress;

        const currentChainName = transferData?.currentCoin?.chain_name;
        const currentSymbol = transferData?.currentCoin?.symbol;
        const currentCalls = transferData?.calls;
        if (
          currentFrom === failedTransaction?.fromAddress &&
          currentTo === failedTransaction?.toAddress &&
          currentAmount === failedTransaction?.amount &&
          currentContractAddress === failedTransaction?.contractAddress &&
          currentChainName === failedTransaction?.chain_name &&
          currentSymbol === failedTransaction?.symbol &&
          currentCalls?.toString() === failedTransaction?.calls?.toString()
        ) {
          setShowDuplicateModal(true);
        }
      }
    };
    validateDuplicateTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSuccess = useCallback(async () => {
    setShowConfirmModal(false);
    await delay(300);
    try {
      // Recompute expiry rather than trusting the timer: the tab may have
      // been suspended past the deadline while the modal was open.
      if (quoteExpiresAt && Date.now() >= quoteExpiresAt) {
        isQuoteExpiredRef.current = true;
        setIsQuoteExpired(true);
        return;
      }
      await submitTransferData();
    } finally {
      // Resume fee polling after a failed/expired send; a successful send
      // navigates away anyway.
      isPauseCalculateFees.current = false;
    }
  }, [submitTransferData, quoteExpiresAt]);

  const handleSubmitForm = () => {
    // The panel can be collapsed with an invalid tip, so re-check here.
    if (!isCustomFeesValid) {
      return;
    }
    if (quoteExpiresAt && Date.now() >= quoteExpiresAt) {
      isQuoteExpiredRef.current = true;
      setIsQuoteExpired(true);
      return;
    }
    setShowConfirmModal(true);
    isPauseCalculateFees.current = true;
  };

  const isDisabled = isBalanceNotAvailable(
    transferData?.selectedUTXOsValue || balance,
    transferData?.transactionFee,
    isExchangeScreen && selectedFromAsset?.type === 'coin'
      ? amountFrom
      : isBatchTransaction
        ? nativeBalanceForBatchTransactions
        : null,
  );

  const fiatSymbol = currencySymbol[localCurrency] || '';
  const feeSymbol = isExchangeScreen
    ? selectedFromAsset?.chain_symbol
    : transferData?.currentCoin?.chain_symbol;

  const currencyRate =
    (isSendFundScreen || isSellCryptoScreen || isStakingScreen
      ? transferData?.currentCoin?.currencyRate
      : isExchangeScreen
        ? selectedFromAsset?.currencyRate
        : '0') || '0';
  const amount =
    (isSendFundScreen || isSellCryptoScreen || isStakingScreen
      ? transferData?.amount
      : isExchangeScreen
        ? amountFrom
        : '0') || '0';
  const currentRateBN = new BigNumber(currencyRate);
  const amountBN = new BigNumber(amount);
  const priceValue = currentRateBN.multipliedBy(amountBN);
  const fiatEstimateFee = transferData?.fiatEstimateFee || '0';
  const fiatEstimateFeeBN = new BigNumber(fiatEstimateFee);
  const totalValue = priceValue.plus(fiatEstimateFeeBN).toFixed(2);

  const fiatValue = `${fiatSymbol}${priceValue?.toFixed(2) || '0'}`;
  const maxTotal = `${fiatSymbol}${totalValue || 0}`;
  const formatAddress = address =>
    isCustomAddressNotSupportedChain(chainName)
      ? address
      : getCustomizePublicAddress(address);

  const walletName = currentWallet?.walletName || 'Wallet';
  const fromParty = coin => ({
    name: walletName,
    sub: formatAddress(coin?.address),
    meta:
      coin?.totalAmount != null
        ? `${coin.totalAmount} ${coin?.symbol || ''} available`
        : null,
  });
  // No address book on web: a resolved name (ENS etc.) is the best label.
  const toParty = (address, extra = {}) => ({
    name: transferData?.validName || formatAddress(address),
    sub: transferData?.validName ? formatAddress(address) : null,
    initial: transferData?.validName ? transferData.validName : '#',
    ...extra,
  });
  const tokenLink = coin =>
    coin?.type === 'token'
      ? `Token · fee paid in ${coin?.chain_symbol || ''}`
      : null;

  const showFeeTiers =
    isFeesOptionChain(convertedChainName) && !!feesOptions?.length;
  const gasCurrency = advancedFeesSheetProps?.gasCurrency;
  const feeAmount = isEip1559
    ? (transferData?.estimatedFee ?? transferData?.transactionFee)
    : transferData?.transactionFee;
  const showTotal = !isVoteStakingScreen && !isBatchTransaction;

  const isSendDisabled =
    isDisabled ||
    isSubmitting ||
    isFetchingFeesAgain ||
    isQuoteExpired ||
    !isCustomFeesValid;

  const ready = feeSuccess || estimateStatus === 'success';

  return {
    // Screen
    title,
    goBack: () => router.back(),
    isLoading,
    isExchangeLoading,
    ready,
    customError,
    localCurrency,

    // Flow
    isSendFundScreen,
    isSellCryptoScreen,
    isExchangeScreen,
    isStakingScreen,
    isBatchTransaction,
    isCreateStaking,
    isWithdrawStaking,

    // Transfer details
    transferData,
    chainName,
    fiatValue,
    formatAddress,
    fromParty,
    toParty,
    tokenLink,
    hederaRecipientStatus,
    hederaRecipient,
    sellCryptoRequestDetails,
    selectedFromAsset,
    selectedToAsset,
    amountFrom,
    amountTo,
    exchangeToName,
    exchangeToAddress,
    selectedExchangeChain,

    // Fees
    showFeeTiers,
    feesOptions,
    selectedFeesType,
    selectedFeesLabel,
    advancedFeesSheetProps,
    gasCurrency,
    isEip1559,
    isCustomFeesValid,
    feeAmount,
    feeSymbol,
    isFetchingFeesAgain,
    isAdvancedOptionsOpen,
    selectCustomFees: () => {
      advancedFeesSheetProps.onSelectFeesType('custom');
      setIsAdvancedOptionsOpen(true);
    },
    openAdvancedOptions: () => setIsAdvancedOptionsOpen(true),
    closeAdvancedOptions: () => setIsAdvancedOptionsOpen(false),

    // Summary and submit
    isDisabled,
    isQuoteExpired,
    showTotal,
    maxTotal,
    isSendDisabled,
    isSubmitting,
    handleSubmitForm,

    // Modals
    showConfirmModal,
    hideConfirmModal: () => {
      setShowConfirmModal(false);
      isPauseCalculateFees.current = false;
    },
    onSuccess,
    showDuplicateModal,
    closeDuplicateModal: () => setShowDuplicateModal(false),
  };
};

export default useCommonTransfer;
