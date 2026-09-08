'use client';

import React, {
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
  useEffect,
  useMemo,
} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {sendFunds} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  getTransferData,
  getTransferDataCustomError,
  getTransferDataFeeSuccess,
  getTransferDataLoading,
  getTransferDataSubmitting,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSelector';
import {currencySymbol} from 'data/currency';
import BigNumber from 'bignumber.js';

import s from './CommonTransfer.module.css';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';
import Loading from 'components/Loading';
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
import {useRouter} from 'next/navigation';
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
import PageTitle from 'components/PageTitle';
import {calculateEstimateFee} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import icons from 'assets/images/icons';
import ValidatorItem from 'components/ValidatorItem';
import {getSellCryptoRequestDetails} from 'dok-wallet-blockchain-networks/redux/sellCrypto/sellCryptoSelectors';
import BatchTransactionItem from 'components/BatchTransactionItem';
import dayjs from 'dayjs';
import DuplicateTransactionModal from 'components/DuplicateTransactionModal';
import AdvancedFeesSheet from 'components/AdvancedFeesSheet';
import useAdvancedFees from 'src/hooks/useAdvancedFees';
import {useHederaRecipientLookup} from 'src/hooks/useHederaAccount';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';

// One label/value line of a details or fee box.
const InfoRow = ({label, value}) => (
  <div className={s.itemView}>
    <p className={s.title}>{label}</p>
    <p className={s.boxBalance}>{value}</p>
  </div>
);

// On EIP-1559 chains `fee` is the reserved maximum (gasLimit * maxFeePerGas);
// what the sender actually pays is `estimatedFee` (gasLimit * (baseFee + tip)).
// Non-1559 chains pay `fee` in full, so only that single row is shown. The
// per-gas parameters (max fee, priority fee) are edited in AdvancedFeesSheet.
const FeeSummaryBox = ({
  isRefreshing,
  fee,
  feeSymbol,
  maxTotalDisplay,
  isEip1559,
  estimatedFee,
  children,
}) => {
  const formatFee = value =>
    isRefreshing ? 'Refreshing' : `${value || '0'} ${feeSymbol}`;
  return (
    <div className={s.box}>
      {children}
      {isEip1559 ? (
        <>
          <InfoRow
            label={'Estimated Fee'}
            value={formatFee(estimatedFee ?? fee)}
          />
          <InfoRow label={'Max Fee'} value={formatFee(fee)} />
        </>
      ) : (
        <InfoRow label={'Network Fee'} value={formatFee(fee)} />
      )}
      {maxTotalDisplay != null && (
        <InfoRow label={'Max Total'} value={maxTotalDisplay} />
      )}
    </div>
  );
};

const CommonTransfer = () => {
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
  const titleRef = useRef('Transfer');

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
    if (!quoteExpiresAt) {
      isQuoteExpiredRef.current = false;
      setIsQuoteExpired(false);
      return;
    }
    const remaining = quoteExpiresAt - Date.now();
    if (remaining <= 0) {
      isQuoteExpiredRef.current = true;
      setIsQuoteExpired(true);
      return;
    }
    isQuoteExpiredRef.current = false;
    setIsQuoteExpired(false);
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
    selectedFeesTypeRef,
    finalNonce,
    isCustomFeesValid,
  } = useAdvancedFees({chainName, convertedChainName, isPauseCalculateFees});

  const nativeBalanceForBatchTransactions = useMemo(() => {
    if (isBatchTransaction && transferData?.transactionsData?.length) {
      const totalBN = transferData?.transactionsData?.reduce((sum, item) => {
        if (item?.coinInfo?.type === 'coin') {
          return sum.plus(new BigNumber(item.transferData?.amount || '0'));
        }
        return sum;
      }, new BigNumber(0));
      return totalBN.toString();
    }
    return null;
  }, [isBatchTransaction, transferData?.transactionsData]);

  useLayoutEffect(() => {
    titleRef.current = isSendFundScreen
      ? 'Transfer'
      : isExchangeScreen
        ? 'Swap Confirm'
        : isSellCryptoScreen
          ? 'Sell Crypto Confirm'
          : isSendNFT
            ? 'Transfer NFT'
            : isCreateVote
              ? 'Confirm Validators'
              : isCreateStaking
                ? 'Confirm Staking'
                : isWithdrawStaking
                  ? 'Confirm Withdraw Staking'
                  : isDeactivateStaking
                    ? 'Confirm Deactivate Staking'
                    : isStakingRewards
                      ? 'Confirm Staking Rewards'
                      : isBatchTransaction
                        ? 'Confirm Batch Transactions'
                        : '';

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWithdrawStaking, isDeactivateStaking, isStakingRewards, isSendNFT]);

  // Latch the render/poll state machine on the first successful estimate.
  // The screen can mount while the first estimate is still in flight, so this
  // fires whenever feeSuccess arrives rather than at mount.
  useEffect(() => {
    if (feeSuccess) {
      setEstimateStatus('success');
    }
  }, [feeSuccess]);

  // Exchange mode used to start polling from quote creation and self-heal a
  // failed FIRST estimate every 10s. Keep that: when the initial estimate
  // settles unsuccessfully (loading finished, no success), enter 'failed' so
  // the poll below starts and the screen can recover on a later tick.
  useEffect(() => {
    if (isExchangeScreen && !isLoading && !isExchangeLoading && !feeSuccess) {
      setEstimateStatus(prev => (prev === 'pending' ? 'failed' : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const toggleAdvancedOptions = () => {
    setIsAdvancedOptionsOpen(prev => !prev);
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

  const feeSummaryProps = {
    isRefreshing: isFetchingFeesAgain,
    fee: transferData?.transactionFee,
    feeSymbol: transferData?.currentCoin?.chain_symbol,
    isEip1559,
    estimatedFee: transferData?.estimatedFee,
  };

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

  const renderSendFundUI = () => {
    return (
      <div className={s.formInput}>
        <p className={s.amountTitle}>{`-${transferData?.amount || 0} ${
          transferData?.currentCoin?.symbol || ''
        }`}</p>
        <p className={s.boxBalance}>
          {currencySymbol[localCurrency] || ''}
          {priceValue?.toFixed(2) || '0'}
        </p>
        <div className={s.box}>
          <div className={s.itemView}>
            <p className={s.title}>{'Chain'}</p>
            <p className={s.boxBalance}>
              {transferData?.currentCoin?.chain_display_name}
            </p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'Asset'}</p>
            <p
              className={
                s.boxBalance
              }>{`${transferData?.currentCoin?.name} (${transferData?.currentCoin?.symbol})`}</p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'From'}</p>
            <p className={s.boxBalance}>{`${
              isCustomAddressNotSupportedChain(chainName)
                ? transferData?.currentCoin?.address
                : getCustomizePublicAddress(transferData?.currentCoin?.address)
            }`}</p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'To'}</p>
            <p className={s.boxBalance}>{`${
              isCustomAddressNotSupportedChain(chainName)
                ? transferData?.toAddress
                : getCustomizePublicAddress(transferData?.toAddress)
            }`}</p>
          </div>
          {!!transferData?.validName && (
            <div className={s.itemView}>
              <p className={s.title}>{'DNS'}</p>
              <p className={s.boxBalance} style={{textTransform: 'none'}}>
                {transferData?.validName}
              </p>
            </div>
          )}
          {!!transferData?.memo && (
            <div className={s.itemView}>
              <p className={s.title}>{'Memo'}</p>
              <p className={s.boxBalance}>{transferData?.memo}</p>
            </div>
          )}
          {chainName === 'hedera' && (
            <>
              {!!transferData?.currentCoin?.accountId && (
                <InfoRow
                  label={'Account ID'}
                  value={transferData.currentCoin.accountId}
                />
              )}
              <InfoRow
                label={'To account ID'}
                value={
                  hederaRecipientStatus === 'resolving'
                    ? 'Resolving…'
                    : hederaRecipientStatus === 'error'
                      ? 'Unavailable'
                      : hederaRecipient?.accountId || 'New account'
                }
              />
            </>
          )}
        </div>
        <FeeSummaryBox
          {...feeSummaryProps}
          maxTotalDisplay={`${currencySymbol[localCurrency]}${totalValue || 0}`}
        />
      </div>
    );
  };
  const renderSellCryptoUI = () => {
    return (
      <div className={s.formInput}>
        <p className={s.amountTitle}>{`-${transferData?.amount || 0} ${
          transferData?.currentCoin?.symbol || ''
        }`}</p>
        <p className={s.boxBalance}>
          {currencySymbol[localCurrency] || ''}
          {priceValue?.toFixed(2) || '0'}
        </p>
        <div className={s.box}>
          <div className={s.itemView}>
            <p className={s.title}>{'Chain'}</p>
            <p className={s.boxBalance}>
              {transferData?.currentCoin?.chain_display_name}
            </p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'Asset'}</p>
            <p
              className={
                s.boxBalance
              }>{`${transferData?.currentCoin?.name} (${transferData?.currentCoin?.symbol})`}</p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'From'}</p>
            <p className={s.boxBalance}>{`${
              isCustomAddressNotSupportedChain(chainName)
                ? transferData?.currentCoin?.address
                : getCustomizePublicAddress(transferData?.currentCoin?.address)
            }`}</p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'To'}</p>
            <p className={s.boxBalance}>{`${
              isCustomAddressNotSupportedChain(chainName)
                ? transferData?.toAddress
                : getCustomizePublicAddress(transferData?.toAddress)
            }`}</p>
          </div>
          {!!transferData?.validName && (
            <div className={s.itemView}>
              <p className={s.title}>{'DNS'}</p>
              <p className={s.boxBalance} style={{textTransform: 'none'}}>
                {transferData?.validName}
              </p>
            </div>
          )}
          {!!transferData?.memo && (
            <div className={s.itemView}>
              <p className={s.title}>{'Memo'}</p>
              <p className={s.boxBalance}>{transferData?.memo}</p>
            </div>
          )}
          <div className={s.itemView}>
            <p className={s.title}>{'Provider'}</p>
            <p className={s.boxBalance}>
              {sellCryptoRequestDetails?.providerDisplayName}
            </p>
          </div>
        </div>
        <FeeSummaryBox
          {...feeSummaryProps}
          maxTotalDisplay={`${currencySymbol[localCurrency]}${totalValue || 0}`}
        />
      </div>
    );
  };
  const renderExchangeUI = () => {
    return (
      <div className={s.formInput}>
        <div className={s.box}>
          <div className={s.itemView}>
            <p className={s.title}>{'Asset'}</p>
            <p
              className={
                s.boxBalance
              }>{`${selectedFromAsset?.name} (${selectedFromAsset?.symbol})`}</p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'From'}</p>
            <p className={s.boxBalance}>{`${getCustomizePublicAddress(
              selectedFromAsset?.address,
            )}`}</p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'Chain'}</p>
            <p
              className={
                s.boxBalance
              }>{`${selectedFromAsset?.chain_display_name}`}</p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'Pay Amount'}</p>
            <p
              className={
                s.boxBalance
              }>{`${amountFrom} ${selectedFromAsset?.symbol}`}</p>
          </div>
        </div>
        <div className={s.iconView}>{icons.sCurved}</div>
        <div className={s.box}>
          <div className={s.itemView}>
            <p className={s.title}>{'Asset'}</p>
            <p
              className={
                s.boxBalance
              }>{`${selectedToAsset?.name} (${selectedToAsset?.symbol})`}</p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'To'}</p>
            <p className={s.boxBalance}>{`${getCustomizePublicAddress(
              exchangeToAddress,
            )}`}</p>
          </div>
          {!!exchangeToName && (
            <div className={s.itemView}>
              <p className={s.title}>{'DNS'}</p>
              <p className={s.boxBalance}>{exchangeToName}</p>
            </div>
          )}
          <div className={s.itemView}>
            <p className={s.title}>{'Chain'}</p>
            <p
              className={
                s.boxBalance
              }>{`${selectedToAsset?.chain_display_name}`}</p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'Receive Amount'}</p>
            <p
              className={
                s.boxBalance
              }>{`${amountTo} ${selectedToAsset?.symbol}`}</p>
          </div>
        </div>
        <FeeSummaryBox
          {...feeSummaryProps}
          feeSymbol={selectedFromAsset?.chain_symbol}
          maxTotalDisplay={`${currencySymbol[localCurrency]}${totalValue || 0}`}>
          {!!selectedExchangeChain?.providerName && (
            <div className={s.itemView}>
              <p className={s.title}>{'Exchange Provider'}</p>
              <p className={s.boxBalance} style={{textTransform: 'capitalize'}}>
                {selectedExchangeChain?.providerName}
              </p>
            </div>
          )}
        </FeeSummaryBox>
      </div>
    );
  };
  const renderStakingUI = () => {
    return (
      <div className={s.formInput}>
        <div className={s.amountTitle}>{`-${
          transferData?.amount || 0
        } ${transferData?.currentCoin?.symbol || ''}`}</div>
        <div className={s.boxBalance}>
          {currencySymbol[localCurrency] || ''}
          {priceValue?.toFixed(2) || '0'}
        </div>
        <div className={s.box}>
          <div className={s.itemView}>
            <div className={s.title}>{'Chain'}</div>
            <div className={s.boxBalance}>
              {transferData?.currentCoin?.chain_display_name}
            </div>
          </div>
          <div className={s.itemView}>
            <div className={s.title}>{'Asset'}</div>
            <div
              className={
                s.boxBalance
              }>{`${transferData?.currentCoin?.name} (${transferData?.currentCoin?.symbol})`}</div>
          </div>
          <div className={s.itemView}>
            <div className={s.title}>{'From'}</div>
            <div className={s.boxBalance}>{`${getCustomizePublicAddress(
              transferData?.currentCoin?.address,
            )}`}</div>
          </div>
          {!!transferData?.validatorPubKey && (
            <div className={s.itemView}>
              <div className={s.title}>{'Validator Address'}</div>
              <div className={s.boxBalance}>{`${getCustomizePublicAddress(
                transferData?.validatorPubKey,
              )}`}</div>
            </div>
          )}
          {!!transferData?.validatorName && (
            <div className={s.itemView}>
              <div className={s.title}>{'Validator Name'}</div>
              <div className={s.boxBalance}>{transferData?.validatorName}</div>
            </div>
          )}
          {!!transferData?.resourceType && (
            <div className={s.itemView}>
              <div className={s.title}>{'Resource Type'}</div>
              <div className={s.boxBalance}>{transferData?.resourceType}</div>
            </div>
          )}
        </div>
        <FeeSummaryBox
          {...feeSummaryProps}
          maxTotalDisplay={`${currencySymbol[localCurrency]}${totalValue || 0}`}
        />
      </div>
    );
  };

  const renderVotingUI = () => {
    const displayValidators = Array.isArray(transferData?.displayValidators)
      ? transferData?.displayValidators
      : [];
    return (
      <div className={s.formInput}>
        {displayValidators?.map(item => (
          <ValidatorItem
            item={item}
            hideInput={true}
            key={item.validatorAddress}
            containerStyle={{
              marginLeft: '0px',
              marginRight: '0px',
              width: '100%',
            }}
          />
        ))}
        <FeeSummaryBox {...feeSummaryProps} />
      </div>
    );
  };

  const renderBatchTransactionUI = () => {
    const batchTransactions = Array.isArray(transferData?.transactionsData)
      ? transferData?.transactionsData
      : [];
    return (
      <div className={s.formInput}>
        {batchTransactions?.map((item, index) => (
          <BatchTransactionItem
            key={`batch_transaction_${index}`}
            item={item}
            isSelected={false}
            isSelectionMode={false}
            localCurrency={localCurrency}
          />
        ))}
        <FeeSummaryBox {...feeSummaryProps} />
      </div>
    );
  };

  return (
    <div className={s.mainView}>
      <div className={s.goBack}>
        <PageTitle title={titleRef.current} />
      </div>
      {/* {!!isSubmitting && <Spinner />} */}
      {(isLoading || isExchangeLoading) && !isFetchingFeesAgain ? (
        <Loading />
      ) : feeSuccess || estimateStatus === 'success' ? (
        <div className={s.container}>
          {isSendFundScreen
            ? renderSendFundUI()
            : isSellCryptoScreen
              ? renderSellCryptoUI()
              : isExchangeScreen
                ? renderExchangeUI()
                : isStakingScreen
                  ? renderStakingUI()
                  : isBatchTransaction
                    ? renderBatchTransactionUI()
                    : renderVotingUI()}
          {isFeesOptionChain(convertedChainName) && !!feesOptions?.length && (
            <div className={s.advancedOptionsContainer}>
              <button
                className={s.advancedOptionsHeader}
                onClick={toggleAdvancedOptions}>
                <div className={s.advancedOptionsTitleContainer}>
                  <span className={s.advancedOptionsSettingsIcon}>
                    {icons.settingsSlider}
                  </span>
                  <span className={s.advancedOptionsTitle}>
                    Advanced Options
                  </span>
                </div>
                <span
                  className={`${s.advancedOptionsChevron} ${isAdvancedOptionsOpen ? s.advancedOptionsChevronOpen : ''}`}>
                  {icons.chevronDown}
                </span>
              </button>
              {isAdvancedOptionsOpen && (
                <div className={s.advancedOptionsContent}>
                  <AdvancedFeesSheet {...advancedFeesSheetProps} />
                </div>
              )}
            </div>
          )}
          {isDisabled && (
            <p
              className={
                s.errorText
              }>{`You don't have enough balance for make transaction you require ${transferData?.transactionFee} ${transferData?.currentCoin?.chain_symbol} to complete the transaction `}</p>
          )}
          {isQuoteExpired && (
            <p className={s.errorText}>
              {'Quote expired — go back and refresh the quote.'}
            </p>
          )}
          {!isCustomFeesValid && (
            <p className={s.errorText}>
              {
                'Priority fee cannot be higher than max fee — fix it in Advanced Options.'
              }
            </p>
          )}
          <button
            disabled={
              isDisabled ||
              isSubmitting ||
              isFetchingFeesAgain ||
              isQuoteExpired ||
              !isCustomFeesValid
            }
            className={s.button}
            style={{
              backgroundColor:
                isDisabled ||
                isSubmitting ||
                isFetchingFeesAgain ||
                isQuoteExpired ||
                !isCustomFeesValid
                  ? 'var(--disabledButton)'
                  : 'var(--background)',
            }}
            onClick={handleSubmitForm}>
            <p className={s.buttonTitle}>Send</p>
          </button>
        </div>
      ) : (
        <div className={s.emptyView}>
          <p className={s.title}>
            {customError
              ? customError?.toString()
              : 'Something went wrong in generating transaction fees'}
          </p>
        </div>
      )}
      <ModalConfirmTransaction
        hideModal={() => {
          setShowConfirmModal(false);
          isPauseCalculateFees.current = false;
        }}
        visible={showConfirmModal}
        onSuccess={onSuccess}
      />
      <DuplicateTransactionModal
        visible={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
      />
    </div>
  );
};

export default CommonTransfer;
