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
import {
  getLocalCurrency,
  isFeesOptions,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {sendFunds} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  getTransferData,
  getTransferDataCustomError,
  getTransferDataFeesOptions,
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
  GAS_CURRENCY,
  getCustomizePublicAddress,
  isBalanceNotAvailable,
  isCustomAddressNotSupportedChain,
  isEVMChain,
  isFeesOptionChain,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import {
  getBalanceForNativeCoin,
  getCurrentWalletPhrase,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {useRouter} from 'next/navigation';
import {getRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraSelectors';
import {getExchange} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSelectors';
import PageTitle from 'components/PageTitle';
import {
  calculateEstimateFee,
  updateFees,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import icons from 'assets/images/icons';
import ValidatorItem from 'components/ValidatorItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import {getSellCryptoRequestDetails} from 'dok-wallet-blockchain-networks/redux/sellCrypto/sellCryptoSelectors';
import BatchTransactionItem from 'components/BatchTransactionItem';

const CommonTransfer = () => {
  const localCurrency = useSelector(getLocalCurrency);
  const transferData = useSelector(getTransferData);
  const isSubmitting = useSelector(getTransferDataSubmitting);
  const isLoading = useSelector(getTransferDataLoading);
  const feeSuccess = useSelector(getTransferDataFeeSuccess);
  const customError = useSelector(getTransferDataCustomError);
  const balance = useSelector(getBalanceForNativeCoin);
  const phrase = useSelector(getCurrentWalletPhrase);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isFetchingFeesAgain, setIsFetchingFeesAgain] = useState(false);
  const [selectedFeesType, setSelectedFeesType] = useState('recommended');
  const sellCryptoRequestDetails = useSelector(getSellCryptoRequestDetails);
  const [customFees, setCustomFees] = useState('');
  const selectedFeesTypeRef = useRef('recommended');
  const isFetchingRef = useRef(false);
  const isPauseCalculateFees = useRef(false);
  const titleRef = useRef('Transfer');

  const [isFetchedSuccessful, setIsFetchedSuccessful] = useState('null');
  const dispatch = useDispatch();
  const currentWallet = useSelector(selectCurrentWallet);
  const routeData = useSelector(getRouteStateData);
  const routeStateData = routeData?.transfer;
  const fromScreen = routeStateData?.fromScreen;
  const isCreateVote = routeStateData?.isCreateVote;
  const {
    selectedFromAsset,
    selectedFromWallet,
    selectedToAsset,
    amountFrom,
    amountTo,
    isLoading: isExchangeLoading,
    success: isExchangeSuccess,
    exchangeToName,
    exchangeToAddress,
    selectedExchangeChain,
  } = useSelector(getExchange);

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

  const chainName = isExchangeScreen
    ? selectedFromAsset?.chain_name
    : transferData?.currentCoin?.chain_name;

  const convertedChainName = isEVMChain(chainName) ? 'ethereum' : chainName;

  const isFeesOptionsEnabled = useSelector(isFeesOptions);
  const feesOptions = useSelector(getTransferDataFeesOptions);

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

  useEffect(() => {
    if (feesOptions?.[0]?.gasPrice) {
      setCustomFees(feesOptions?.[0]?.gasPrice);
    }
  }, [feesOptions]);

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

  useEffect(() => {
    if (
      (isExchangeSuccess && isExchangeScreen) ||
      ((isSendFundScreen ||
        isSellCryptoScreen ||
        isSendNFT ||
        isStakingScreen ||
        isBatchTransaction) &&
        feeSuccess)
    ) {
      setIsFetchedSuccessful('true');
      let timeout = setInterval(() => {
        if (!isFetchingRef.current && !isPauseCalculateFees.current) {
          setIsFetchingFeesAgain(true);

          isFetchingRef.current = true;
          dispatch(
            calculateEstimateFee({
              fromAddress:
                isSendFundScreen ||
                isSellCryptoScreen ||
                isStakingScreen ||
                isBatchTransaction
                  ? transferData?.currentCoin?.address
                  : isExchangeScreen
                    ? selectedFromAsset?.address
                    : transferData?.selectedNFT?.coin?.address,
              toAddress: transferData.toAddress,
              memo: transferData.memo,
              amount:
                isSendFundScreen || isSellCryptoScreen || isStakingScreen
                  ? transferData?.amount
                  : isExchangeScreen
                    ? amountFrom
                    : null,
              contractAddress: isSendNFT
                ? transferData?.selectedNFT?.token_address ||
                  transferData?.selectedNFT?.associatedTokenAddress
                : transferData?.currentCoin?.contractAddress,
              balance: transferData?.currentCoin?.totalAmount,
              selectedWallet: isExchangeScreen
                ? selectedFromWallet
                : isSendNFT
                  ? currentWallet
                  : null,
              selectedCoin: isExchangeScreen
                ? selectedFromAsset
                : isSendNFT
                  ? transferData?.currentCoin
                  : null,
              contract_type: isSendNFT
                ? transferData?.selectedNFT?.contract_type
                : null,
              isNFT: isSendNFT,
              mint: isSendNFT ? transferData?.selectedNFT?.mint : null,
              tokenId: isSendNFT ? transferData?.selectedNFT?.token_id : null,
              tokenAmount: isSendNFT
                ? transferData?.selectedNFT?.amount || 1
                : null,
              validatorPubKey: isStakingScreen
                ? transferData?.validatorPubKey
                : null,
              stakingAddress: isStakingScreen
                ? transferData?.stakingAddress
                : null,
              stakingBalance: isStakingScreen
                ? transferData?.stakingBalance
                : null,
              resourceType: isStakingScreen ? transferData?.resourceType : null,
              selectedVotes: isVoteStakingScreen
                ? transferData?.selectedVotes
                : null,
              isBatchTransaction,
              currentCoin: isBatchTransaction
                ? transferData?.currentCoin
                : null,
              calls: isBatchTransaction ? transferData?.calls : null,
              isCreateStaking: isCreateStaking,
              isWithdrawStaking: !!isWithdrawStaking,
              isStakingRewards: !!isStakingRewards,
              isDeactivateStaking: !!isDeactivateStaking,
              feesType: selectedFeesTypeRef.current,
              estimateGas: transferData?.estimateGas,
            }),
          )
            .unwrap()
            .then(resp => {
              setIsFetchingFeesAgain(false);
              isFetchingRef.current = false;
              setIsFetchedSuccessful(resp ? 'true' : 'false');
            });
        }
      }, 10000);
      return () => {
        clearTimeout(timeout);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeSuccess, isExchangeSuccess]);

  const submitTransferData = useCallback(async () => {
    await dispatch(
      sendFunds({
        to: transferData.toAddress,
        memo: transferData.memo,
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
        stakingAddress: isStakingScreen ? transferData?.stakingAddress : null,
        numberOfStakeAccount: isStakingScreen
          ? transferData?.currentCoin?.staking?.length || 0
          : null,
        phrase,
        router,
      }),
    );
  }, [
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

  const onSuccess = useCallback(async () => {
    setShowConfirmModal(false);
    await delay(300);
    await submitTransferData();
  }, [submitTransferData]);

  const handleSubmitForm = () => {
    setShowConfirmModal(true);
    isPauseCalculateFees.current = true;
  };

  const onChangeCustomFees = e => {
    const text = e?.target?.value;
    const tempValues = validateNumberInInput(
      text,
      transferData?.currentCoin?.decimal,
    );
    setCustomFees(tempValues || '0');
    dispatch(updateFees({gasPrice: tempValues || '0', convertedChainName}));
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
        </div>
        <div className={s.box}>
          <div className={s.itemView}>
            <p className={s.title}>{'Network Fee'}</p>
            <p className={s.boxBalance}>
              {isFetchingFeesAgain
                ? 'Refreshing'
                : `${transferData?.transactionFee || '0'} ${
                    transferData?.currentCoin?.chain_symbol
                  }`}
            </p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'Max Total'}</p>
            <p className={s.boxBalance}>{`${currencySymbol[localCurrency]}${
              totalValue || 0
            }`}</p>
          </div>
        </div>
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
        <div className={s.box}>
          <div className={s.itemView}>
            <p className={s.title}>{'Network Fee'}</p>
            <p className={s.boxBalance}>
              {isFetchingFeesAgain
                ? 'Refreshing'
                : `${transferData?.transactionFee || '0'} ${
                    transferData?.currentCoin?.chain_symbol
                  }`}
            </p>
          </div>
          <div className={s.itemView}>
            <p className={s.title}>{'Max Total'}</p>
            <p className={s.boxBalance}>{`${currencySymbol[localCurrency]}${
              totalValue || 0
            }`}</p>
          </div>
        </div>
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
        <div className={s.box}>
          {!!selectedExchangeChain?.providerName && (
            <div className={s.itemView}>
              <p className={s.title}>{'Exchange Provider'}</p>
              <p className={s.boxBalance}>
                {selectedExchangeChain?.providerName}
              </p>
            </div>
          )}
          <div className={s.itemView}>
            <p className={s.title}>{'Network Fee'}</p>
            <p className={s.boxBalance}>
              {isFetchingFeesAgain
                ? 'Refreshing'
                : `${transferData?.transactionFee || '0'} ${
                    selectedFromAsset?.chain_symbol
                  }`}
            </p>
          </div>

          <div className={s.itemView}>
            <p className={s.title}>{'Max Total'}</p>
            <p className={s.boxBalance}>{`${
              currencySymbol[localCurrency]
            }${totalValue || 0}`}</p>
          </div>
        </div>
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
        <div className={s.box}>
          <div className={s.itemView}>
            <div className={s.title}>{'Network Fee'}</div>
            <div className={s.boxBalance}>
              {isFetchingFeesAgain
                ? 'Refreshing'
                : `${transferData?.transactionFee || '0'} ${
                    transferData?.currentCoin?.chain_symbol
                  }`}
            </div>
          </div>
          <div className={s.itemView}>
            <div className={s.title}>{'Max Total'}</div>
            <div className={s.boxBalance}>{`${
              currencySymbol[localCurrency]
            }${totalValue || 0}`}</div>
          </div>
        </div>
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
        <div className={s.box}>
          <div className={s.itemView}>
            <div className={s.title}>{'Network Fee'}</div>
            <div className={s.boxBalance}>
              {isFetchingFeesAgain
                ? 'Refreshing'
                : `${transferData?.transactionFee || '0'} ${
                    transferData?.currentCoin?.chain_symbol
                  }`}
            </div>
          </div>
        </div>
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
        <div className={s.box}>
          <div className={s.itemView}>
            <div className={s.title}>{'Network Fee'}</div>
            <div className={s.boxBalance}>
              {isFetchingFeesAgain
                ? 'Refreshing'
                : `${transferData?.transactionFee || '0'} ${
                    transferData?.currentCoin?.chain_symbol
                  }`}
            </div>
          </div>
        </div>
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
      ) : feeSuccess || isExchangeSuccess || isFetchedSuccessful === 'true' ? (
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
          {isFeesOptionsEnabled &&
            isFeesOptionChain(convertedChainName) &&
            !!feesOptions?.length &&
            !isExchangeScreen && (
              <div className={s.feesMainContainer}>
                <div className={s.feesOptionContainer}>
                  <button
                    onClick={() => {
                      isPauseCalculateFees.current = false;
                      setSelectedFeesType('recommended');
                      selectedFeesTypeRef.current = 'recommended';
                      dispatch(
                        updateFees({
                          gasPrice: feesOptions?.[0].gasPrice,
                          convertedChainName,
                        }),
                      );
                    }}
                    style={
                      selectedFeesType?.toLowerCase() ===
                      feesOptions?.[0]?.title?.toLowerCase()
                        ? {
                            borderColor: 'var(--background)',
                            borderWidth: '3px',
                          }
                        : {}
                    }
                    className={s.feesOptionsItem}>
                    <p
                      className={
                        s.feesOptionTitle
                      }>{`${feesOptions?.[0].title}`}</p>
                    <p className={s.feesOptionDescription}>
                      {`${feesOptions?.[0].gasPrice} ${GAS_CURRENCY[convertedChainName]}`}
                    </p>
                  </button>
                  <button
                    className={s.feesOptionsItem}
                    style={
                      selectedFeesType?.toLowerCase() ===
                      feesOptions?.[1]?.title?.toLowerCase()
                        ? {
                            borderColor: 'var(--background)',
                            borderWidth: '3px',
                          }
                        : {}
                    }
                    onClick={() => {
                      isPauseCalculateFees.current = false;
                      setSelectedFeesType('normal');
                      selectedFeesTypeRef.current = 'normal';
                      dispatch(
                        updateFees({
                          gasPrice: feesOptions?.[1].gasPrice,
                          convertedChainName,
                        }),
                      );
                    }}>
                    <p
                      className={
                        s.feesOptionTitle
                      }>{`${feesOptions?.[1].title}`}</p>
                    <p className={s.feesOptionDescription}>
                      {`${feesOptions?.[1].gasPrice} ${GAS_CURRENCY[convertedChainName]}`}
                    </p>
                  </button>
                  <button
                    className={s.feesOptionsItem}
                    style={
                      selectedFeesType?.toLowerCase() === 'custom'
                        ? {
                            borderColor: 'var(--background)',
                            borderWidth: '3px',
                          }
                        : {}
                    }
                    onClick={() => {
                      isPauseCalculateFees.current = true;
                      setSelectedFeesType('custom');
                      selectedFeesTypeRef.current = 'custom';
                    }}>
                    <p className={s.feesOptionTitle}>{`Custom`}</p>
                  </button>
                </div>
                {selectedFeesType === 'custom' && (
                  <FormControl variant='outlined'>
                    <InputLabel
                      sx={{
                        color: 'var(--borderActiveColor)',
                      }}
                      focused={false}>
                      Gas Fees
                    </InputLabel>
                    <OutlinedInput
                      fullWidth
                      autoFocus={true}
                      id='customText'
                      type={'text'}
                      name='Gas Price'
                      onChange={onChangeCustomFees}
                      value={customFees}
                      placeholder='Enter Gas fee in Gwei'
                      label='Full Name'
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'var(--sidebarIcon)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'var(--borderActiveColor)',
                        },
                        '& .MuiInputLabel-outlined': {
                          color: 'var(--sidebarIcon)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'var(--sidebarIcon) !important',
                        },
                      }}
                    />
                  </FormControl>
                )}
              </div>
            )}
          {isDisabled && (
            <p
              className={
                s.errorText
              }>{`You don't have enough balance for make transaction you require ${transferData?.transactionFee} ${transferData?.currentCoin?.chain_symbol} to complete the transaction `}</p>
          )}
          <button
            disabled={isDisabled || isSubmitting || isFetchingFeesAgain}
            className={s.button}
            style={{
              backgroundColor:
                isDisabled || isSubmitting || isFetchingFeesAgain
                  ? '#708090'
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
    </div>
  );
};

export default CommonTransfer;
