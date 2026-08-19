'use client';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Box, Modal} from '@mui/material';
import {useDispatch, useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {
  isEVMChain,
  isBalanceNotAvailable,
  GAS_CURRENCY,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import {
  fetchStakingApproveEstimationFee,
  updateApproveFees,
} from 'dok-wallet-blockchain-networks/redux/staking/stakingSlice';
import {
  getStakingAllowance,
  getStakingAllowanceLoading,
} from 'dok-wallet-blockchain-networks/redux/staking/stakingSelectors';
import {
  fetchExchangeApproveEstimationFee,
  updateExchangeApproveFees,
} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';
import {
  getExchangeAllowance,
  getExchangeAllowanceLoading,
} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSelectors';
import {selectUserCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import s from './ModalAllowanceInfo.module.css';

const selectNativeBalance = (chainName, chainSymbol) => state => {
  const allCoins = selectUserCoins(state);
  const nativeCoin = allCoins.find(
    item =>
      item.symbol === chainSymbol &&
      item.chain_name === chainName &&
      item.type !== 'token',
  );
  return nativeCoin?.totalAmount || 0;
};

const ModalAllowanceInfo = ({
  source = 'staking',
  visible,
  onClose,
  tokenSymbol,
  requiredAmount,
  availableAmount,
  approveLoading,
  onContinue,
  stakingProviderName,
  amount,
  chainName,
  chainSymbol,
}) => {
  const dispatch = useDispatch();
  const isExchange = source === 'exchange';
  const contractLabel = isExchange ? 'exchange provider' : 'staking contract';

  const allowanceData = useSelector(
    isExchange ? getExchangeAllowance : getStakingAllowance,
  );
  const isLoading = useSelector(
    isExchange ? getExchangeAllowanceLoading : getStakingAllowanceLoading,
  );
  const nativeBalance = useSelector(
    selectNativeBalance(chainName, chainSymbol),
  );

  const [selectedType, setSelectedType] = useState('manual');
  const [selectedFeesType, setSelectedFeesType] = useState('recommended');
  const [customNonce, setCustomNonce] = useState('');
  const [customFees, setCustomFees] = useState('');
  const [isFetchingFeesAgain, setIsFetchingFeesAgain] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const convertedChainName = isEVMChain(chainName) ? 'ethereum' : chainName;

  // Refs mirror volatile values so the interval reads them at call time
  // without being recreated on every change (keeps the interval stable).
  const isFetchingFeesRef = useRef(false);
  const isPauseCalculateFees = useRef(false);
  const selectedFeesTypeRef = useRef('recommended');
  const selectedTypeRef = useRef('manual');
  const customNonceRef = useRef('');
  const customFeesRef = useRef('');
  const allowanceDataRef = useRef(null);

  useEffect(() => {
    customNonceRef.current = customNonce;
  }, [customNonce]);
  useEffect(() => {
    customFeesRef.current = customFees;
  }, [customFees]);
  useEffect(() => {
    selectedTypeRef.current = selectedType;
  }, [selectedType]);
  useEffect(() => {
    allowanceDataRef.current = allowanceData;
  }, [allowanceData]);

  // Reset local UI each time the modal opens.
  useEffect(() => {
    if (visible) {
      setSelectedType('manual');
      setSelectedFeesType('recommended');
      selectedTypeRef.current = 'manual';
      selectedFeesTypeRef.current = 'recommended';
      isPauseCalculateFees.current = false;
      setHasError(false);
      setShowAdvanced(false);
    }
  }, [visible]);

  // Sync nonce input when allowanceData updates.
  useEffect(() => {
    if (allowanceData?.nonce != null) {
      setCustomNonce(String(allowanceData.nonce));
    }
  }, [allowanceData?.nonce]);

  // Default custom gas price when feesOptions arrive, unless user picked custom.
  useEffect(() => {
    if (
      allowanceData?.feesOptions?.[0]?.gasPrice &&
      selectedFeesTypeRef.current !== 'custom'
    ) {
      setCustomFees(allowanceData?.feesOptions?.[0]?.gasPrice);
    }
  }, [allowanceData?.feesOptions]);

  const fetchEstimationFee = useCallback(() => {
    if (isFetchingFeesRef.current) {
      return;
    }
    isFetchingFeesRef.current = true;
    setIsFetchingFeesAgain(true);
    setHasError(false);
    const latestAllowanceData = allowanceDataRef.current;
    const action = isExchange
      ? fetchExchangeApproveEstimationFee({
          feesType: selectedFeesTypeRef.current,
          nonce: customNonceRef.current || latestAllowanceData?.nonce,
        })
      : fetchStakingApproveEstimationFee({
          isFetchNonce: false,
          stakingProviderName,
          amount,
          nonce: customNonceRef.current || latestAllowanceData?.nonce,
          feesType: selectedFeesTypeRef.current,
          estimateGas: latestAllowanceData?.estimateGas,
          customGasPrice:
            selectedFeesTypeRef.current === 'custom'
              ? customFeesRef.current
              : undefined,
          allowanceType: selectedTypeRef.current,
        });
    dispatch(action)
      .unwrap()
      .then(() => {
        setIsFetchingFeesAgain(false);
        isFetchingFeesRef.current = false;
      })
      .catch(error => {
        console.error('error in allowance fee estimation', error);
        setIsFetchingFeesAgain(false);
        isFetchingFeesRef.current = false;
        setHasError(true);
      });
  }, [dispatch, stakingProviderName, amount, isExchange]);

  // Fire once when the modal opens, then refresh every 10s. Gated by refs so it
  // never piles up and never runs while custom fees are selected.
  useEffect(() => {
    if (!visible || (!isExchange && (!stakingProviderName || !amount))) {
      return;
    }
    fetchEstimationFee();
    const interval = setInterval(() => {
      if (!isFetchingFeesRef.current && !isPauseCalculateFees.current) {
        fetchEstimationFee();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [visible, stakingProviderName, amount, isExchange, fetchEstimationFee]);

  const displayRequiredAmount =
    allowanceData?.stakeAmountFormatted || requiredAmount || '0';

  const insufficientBalance = useMemo(() => {
    if (!displayRequiredAmount || !availableAmount) {
      return false;
    }
    return new BigNumber(displayRequiredAmount).gt(
      new BigNumber(availableAmount),
    );
  }, [displayRequiredAmount, availableAmount]);

  // No truthiness guard on nativeBalance: a zero balance must count as
  // insufficient whenever a nonzero fee is required (the selector already
  // defaults a missing coin to 0, and isBalanceNotAvailable compares
  // numerically via BigNumber).
  const isInsufficientFeeBalance = useMemo(
    () =>
      !!allowanceData?.transactionFee &&
      isBalanceNotAvailable(nativeBalance, allowanceData.transactionFee),
    [nativeBalance, allowanceData?.transactionFee],
  );

  // Each flow keeps its fee on its own slice, so the recompute has to be routed
  // to the matching one. Dispatching the staking action unconditionally would
  // write into state.staking.allowanceData even in exchange mode, which would
  // leave the exchange fee on screen unchanged and corrupt staking state.
  const updateFeesAction = isExchange
    ? updateExchangeApproveFees
    : updateApproveFees;

  const onSelectFeesType = useCallback(
    (type, gasPrice) => {
      if (type === 'custom') {
        isPauseCalculateFees.current = true;
        setSelectedFeesType('custom');
        selectedFeesTypeRef.current = 'custom';
      } else {
        isPauseCalculateFees.current = false;
        setSelectedFeesType(type);
        selectedFeesTypeRef.current = type;
        if (gasPrice) {
          setCustomFees(gasPrice);
          dispatch(updateFeesAction({gasPrice, convertedChainName}));
        }
      }
    },
    [dispatch, convertedChainName, updateFeesAction],
  );

  const onChangeCustomFees = useCallback(
    event => {
      const tempValues = validateNumberInInput(
        event.target.value,
        allowanceData?.decimal,
      );
      setCustomFees(tempValues);
      dispatch(
        updateFeesAction({gasPrice: tempValues || '0', convertedChainName}),
      );
    },
    [allowanceData?.decimal, convertedChainName, dispatch, updateFeesAction],
  );

  const onChangeCustomNonce = useCallback(event => {
    setCustomNonce(event.target.value.replace(/[^0-9]/g, ''));
  }, []);

  const isDisabled =
    isLoading ||
    approveLoading ||
    isFetchingFeesAgain ||
    insufficientBalance ||
    isInsufficientFeeBalance;

  const handleApprove = useCallback(() => {
    if (!onContinue) {
      return;
    }
    isPauseCalculateFees.current = true;
    const gasFeeWei =
      selectedFeesType === 'recommended' && allowanceData?.gasFee
        ? allowanceData?.gasFee
        : new BigNumber(customFees || '0').multipliedBy(1e9).toFixed(0);
    const finalNonce = parseInt(customNonce, 10);
    onContinue({
      isFetchNonce: false,
      type: selectedType,
      gasFee: gasFeeWei,
      maxPriorityFeePerGas: allowanceData?.maxPriorityFeePerGas,
      stakingProviderName,
      amount,
      nonce: !isNaN(finalNonce) ? finalNonce : allowanceData?.nonce,
      feesType: selectedFeesTypeRef.current,
      estimateGas: allowanceData?.estimateGas,
      customGasPrice:
        selectedFeesTypeRef.current === 'custom' ? customFees : undefined,
    });
  }, [
    onContinue,
    selectedFeesType,
    allowanceData?.gasFee,
    allowanceData?.maxPriorityFeePerGas,
    allowanceData?.nonce,
    allowanceData?.estimateGas,
    customFees,
    customNonce,
    selectedType,
    stakingProviderName,
    amount,
  ]);

  const feesOptions = allowanceData?.feesOptions;
  const gasCurrency = GAS_CURRENCY[convertedChainName] || 'Gwei';

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'var(--secondaryBackgroundColor)',
    borderRadius: '10px',
    overflow: 'hidden',
    maxWidth: '460px',
    width: '92%',
  };

  return (
    <Modal open={!!visible} onClose={onClose} sx={{zIndex: 99999}}>
      <Box sx={style}>
        <div className={s.container}>
          <div className={s.title}>Token Allowance</div>

          {approveLoading ? (
            <div className={s.centerView}>
              <div className={s.spinner} />
              <p className={s.body}>Processing approval...</p>
            </div>
          ) : isLoading && !isFetchingFeesAgain ? (
            <div className={s.centerView}>
              <div className={s.spinner} />
              <p className={s.body}>Fetching allowance...</p>
            </div>
          ) : hasError ? (
            <div className={s.centerView}>
              <p className={s.title}>Something went wrong</p>
              <p className={s.body}>
                We couldn&apos;t estimate the network fee right now. Please
                check your connection and try again.
              </p>
              <button className={s.secondaryBtn} onClick={fetchEstimationFee}>
                Retry
              </button>
            </div>
          ) : (
            <>
              {allowanceData ? (
                <div
                  className={`${s.statusText} ${
                    allowanceData.isApproved
                      ? s.statusApproved
                      : s.statusPending
                  }`}>
                  {allowanceData.isApproved
                    ? `Current allowance: ${parseFloat(
                        allowanceData.allowanceFormatted || '0',
                      ).toFixed(6)}`
                    : `Allowance required: ${parseFloat(
                        allowanceData.requiredFormatted || '0',
                      ).toFixed(6)} (current: ${parseFloat(
                        allowanceData.allowanceFormatted || '0',
                      ).toFixed(6)})`}
                </div>
              ) : isFetchingFeesAgain ? (
                <div className={`${s.statusText} ${s.statusPending}`}>
                  Current allowance: Refreshing...
                </div>
              ) : null}

              <div className={s.sectionLabel}>Select Approval Type</div>
              <p className={s.whatIsApprove}>
                {`Approval is a one-time on-chain permission that lets the ${contractLabel} use your ${
                  tokenSymbol || 'tokens'
                }. Your tokens stay in your wallet until you ${
                  isExchange ? 'swap' : 'stake'
                }.`}
              </p>

              <div className={s.cardsRow}>
                <button
                  className={`${s.card} ${
                    selectedType === 'manual' ? s.cardSelected : ''
                  }`}
                  onClick={() => setSelectedType('manual')}>
                  <div className={s.cardTitle}>Manual</div>
                  <div className={s.cardDesc}>Approve only this amount</div>
                  <div className={s.cardAmount}>
                    {parseFloat(displayRequiredAmount).toFixed(6)}
                  </div>
                  <div className={s.cardSymbol}>{tokenSymbol || ''}</div>
                </button>

                <button
                  className={`${s.card} ${
                    selectedType === 'unlimited' ? s.cardSelected : ''
                  }`}
                  onClick={() => setSelectedType('unlimited')}>
                  <div className={s.cardTitle}>Unlimited</div>
                  <div className={s.cardDesc}>Approve once, skip future</div>
                  <div className={s.cardAmount}>∞</div>
                  <div className={s.cardSymbol}>{tokenSymbol || ''}</div>
                </button>
              </div>

              {insufficientBalance ? (
                <p className={s.errorText}>
                  {`Insufficient balance. Amount exceeds available balance of ${parseFloat(
                    availableAmount || '0',
                  ).toFixed(6)} ${tokenSymbol || ''}.`}
                </p>
              ) : (
                <p
                  className={
                    selectedType === 'unlimited' ? s.noteWarning : s.noteSafe
                  }>
                  {selectedType === 'unlimited'
                    ? `The ${contractLabel} can move any amount of your ${
                        tokenSymbol || 'tokens'
                      } until you revoke it. Saves fees and time on future ${
                        isExchange ? 'swaps' : 'stakes'
                      } — choose only for protocols you trust.`
                    : `Safest option. The contract can only ever move this exact amount — you'll need to approve again for future ${
                        isExchange ? 'swaps' : 'stakes'
                      }.`}
                </p>
              )}

              <div className={s.feeRow}>
                <span className={s.feeLabel}>Network Fee</span>
                <span className={s.feeValue}>
                  {isFetchingFeesAgain
                    ? 'Refreshing...'
                    : `${allowanceData?.transactionFee || '0'} ${
                        chainSymbol || ''
                      }`}
                </span>
              </div>

              {!!feesOptions?.length && (
                <button
                  className={s.advancedToggle}
                  onClick={() => setShowAdvanced(prev => !prev)}>
                  {showAdvanced ? 'Hide advanced' : 'Advanced options'}
                </button>
              )}

              {showAdvanced && !!feesOptions?.length && (
                <div className={s.advancedBox}>
                  <div className={s.feesOptionsRow}>
                    {feesOptions?.slice(0, 2).map(option => (
                      <button
                        key={option?.title}
                        className={`${s.feesOptionsItem} ${
                          selectedFeesType?.toLowerCase() ===
                          option?.title?.toLowerCase()
                            ? s.feesOptionSelected
                            : ''
                        }`}
                        onClick={() =>
                          onSelectFeesType(
                            option?.title?.toLowerCase(),
                            option?.gasPrice,
                          )
                        }>
                        <p className={s.feesOptionTitle}>{option?.title}</p>
                        <p className={s.feesOptionValue}>
                          {`${option?.gasPrice} ${gasCurrency}`}
                        </p>
                      </button>
                    ))}
                    <button
                      className={`${s.feesOptionsItem} ${
                        selectedFeesType?.toLowerCase() === 'custom'
                          ? s.feesOptionSelected
                          : ''
                      }`}
                      onClick={() => onSelectFeesType('custom')}>
                      <p className={s.feesOptionTitle}>Custom</p>
                    </button>
                  </div>
                  {selectedFeesType === 'custom' && (
                    <div className={s.customInputRow}>
                      <span
                        className={
                          s.customLabel
                        }>{`Gas Price (${gasCurrency})`}</span>
                      <input
                        className={s.customInput}
                        type='number'
                        value={customFees}
                        onChange={onChangeCustomFees}
                      />
                    </div>
                  )}
                  <div className={s.customInputRow}>
                    <span className={s.customLabel}>Nonce</span>
                    <input
                      className={s.customInput}
                      type='number'
                      value={customNonce}
                      onChange={onChangeCustomNonce}
                    />
                  </div>
                </div>
              )}

              {isInsufficientFeeBalance ? (
                <p className={s.errorText}>
                  {`Insufficient ${
                    chainSymbol || ''
                  } balance to pay the network fee.`}
                </p>
              ) : null}
            </>
          )}

          {!approveLoading && !hasError && (
            <div className={s.actions}>
              <button
                className={s.primaryBtn}
                disabled={isDisabled}
                style={{
                  backgroundColor: isDisabled ? 'var(--gray)' : undefined,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
                onClick={handleApprove}>
                Approve
              </button>
              <button className={s.secondaryBtn} onClick={onClose}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </Box>
    </Modal>
  );
};

export default ModalAllowanceInfo;
