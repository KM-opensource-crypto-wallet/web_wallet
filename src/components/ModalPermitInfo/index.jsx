'use client';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Box, Modal} from '@mui/material';
import {useDispatch, useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import GppGoodIcon from '@mui/icons-material/GppGood';
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EditIcon from '@mui/icons-material/Edit';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  isBalanceNotAvailable,
  isEVMChain,
  GAS_CURRENCY,
  delay,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import {
  fetchExchangePermitApproveEstimationFee,
  updateExchangeApproveFees,
} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';
import {
  getExchangePermitAllowance,
  getExchangePermitAllowanceLoading,
} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSelectors';
import {selectUserCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';
import s from './ModalPermitInfo.module.css';

const FEES_TYPE_TO_INDEX = {recommended: 0, normal: 1};

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

// Router-level (Permit2) allowance confirmation, shown after the ERC20-level
// ModalAllowanceInfo approval when the swap quote uses a permit2 spender
// (swapData.permit_abi is present).
const ModalPermitInfo = ({
  visible,
  onClose,
  tokenSymbol,
  requiredAmount,
  availableAmount,
  approveLoading,
  onContinue,
  chainName,
  chainSymbol,
}) => {
  const dispatch = useDispatch();

  const permitAllowanceData = useSelector(getExchangePermitAllowance);
  const isLoading = useSelector(getExchangePermitAllowanceLoading);
  const nativeBalance = useSelector(
    selectNativeBalance(chainName, chainSymbol),
  );

  const [selectedType, setSelectedType] = useState('manual');
  const [selectedFeesType, setSelectedFeesType] = useState('recommended');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [customNonce, setCustomNonce] = useState('');
  const [customFees, setCustomFees] = useState('');
  const [isFetchingFeesAgain, setIsFetchingFeesAgain] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const convertedChainName = isEVMChain(chainName) ? 'ethereum' : chainName;

  // Refs mirror volatile values so the fetch can read them at call time
  // without being recreated on every change (keeps the interval stable).
  const isFetchingFeesRef = useRef(false);
  const isPauseCalculateFees = useRef(false);
  const selectedFeesTypeRef = useRef('recommended');
  const selectedTypeRef = useRef('manual');
  const customNonceRef = useRef('');
  const permitAllowanceDataRef = useRef(null);

  useEffect(() => {
    customNonceRef.current = customNonce;
  }, [customNonce]);
  useEffect(() => {
    selectedTypeRef.current = selectedType;
  }, [selectedType]);
  useEffect(() => {
    permitAllowanceDataRef.current = permitAllowanceData;
  }, [permitAllowanceData]);

  // Reset local UI each time the modal opens (replaces mobile's present()).
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

  // Sync nonce input when permitAllowanceData updates
  useEffect(() => {
    if (permitAllowanceData?.nonce != null) {
      setCustomNonce(String(permitAllowanceData.nonce));
    }
  }, [permitAllowanceData?.nonce]);

  // Sync custom gas price when feesOptions arrive/refresh, tracking whichever
  // non-custom tier is currently selected (not always the first option).
  useEffect(() => {
    const currentType = selectedFeesTypeRef.current;
    if (currentType === 'custom') {
      return;
    }
    const tierIndex = FEES_TYPE_TO_INDEX[currentType] ?? 0;
    const gasPrice = permitAllowanceData?.feesOptions?.[tierIndex]?.gasPrice;
    if (gasPrice) {
      setCustomFees(gasPrice);
    }
  }, [permitAllowanceData?.feesOptions]);

  const onChangeCustomFees = useCallback(
    event => {
      const tempValues = validateNumberInInput(
        event.target.value,
        permitAllowanceData?.decimal,
      );
      setCustomFees(tempValues);
      // Without this the displayed Network Fee would ignore a custom gas price
      // entirely, even though the value is still used to sign the approval.
      dispatch(
        updateExchangeApproveFees({
          target: 'permit',
          gasPrice: tempValues || '0',
          convertedChainName,
        }),
      );
    },
    [permitAllowanceData?.decimal, convertedChainName, dispatch],
  );

  const onChangeCustomNonce = useCallback(event => {
    setCustomNonce(event.target.value.replace(/[^0-9]/g, ''));
  }, []);

  // Stable across renders: volatile values (nonce, fees type) are read from
  // refs at call time, so completing a fetch never recreates this callback.
  const fetchEstimationFee = useCallback(() => {
    if (isFetchingFeesRef.current) {
      return;
    }
    isFetchingFeesRef.current = true;
    setIsFetchingFeesAgain(true);
    setHasError(false);
    const latestPermitAllowanceData = permitAllowanceDataRef.current;
    dispatch(
      fetchExchangePermitApproveEstimationFee({
        feesType: selectedFeesTypeRef.current,
        nonce: customNonceRef.current || latestPermitAllowanceData?.nonce,
      }),
    )
      .unwrap()
      .then(() => {
        setIsFetchingFeesAgain(false);
        isFetchingFeesRef.current = false;
      })
      .catch(error => {
        console.error('error in permit fee estimation', error);
        setIsFetchingFeesAgain(false);
        isFetchingFeesRef.current = false;
        setHasError(true);
      });
  }, [dispatch]);

  // Single source of fee refresh: fire once when the modal opens, then every
  // 10s. The tick is gated by refs (in-flight + pause), so it never piles up
  // and never runs while custom fees are selected or a transaction is pending.
  useEffect(() => {
    if (!visible) {
      return;
    }
    fetchEstimationFee();
    const interval = setInterval(() => {
      if (!isFetchingFeesRef.current && !isPauseCalculateFees.current) {
        fetchEstimationFee();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [visible, fetchEstimationFee]);

  const displayRequiredAmount = requiredAmount || '0';

  const insufficientBalance = useMemo(() => {
    if (!displayRequiredAmount || !availableAmount) {
      return false;
    }
    return new BigNumber(displayRequiredAmount).gt(
      new BigNumber(availableAmount),
    );
  }, [displayRequiredAmount, availableAmount]);

  const isInsufficientFeeBalance = useMemo(
    () =>
      nativeBalance != null &&
      permitAllowanceData?.transactionFee != null &&
      isBalanceNotAvailable(nativeBalance, permitAllowanceData.transactionFee),
    [nativeBalance, permitAllowanceData?.transactionFee],
  );

  const handleContinue = useCallback(() => {
    setShowConfirmModal(true);
    isPauseCalculateFees.current = true;
  }, []);

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
          dispatch(
            updateExchangeApproveFees({
              target: 'permit',
              gasPrice,
              convertedChainName,
            }),
          );
        }
      }
    },
    [convertedChainName, dispatch],
  );

  const isDisabled =
    isLoading ||
    approveLoading ||
    isFetchingFeesAgain ||
    insufficientBalance ||
    isInsufficientFeeBalance;

  const submitTransferData = useCallback(async () => {
    if (!onContinue) {
      return;
    }
    const gasFeeWei =
      selectedFeesType === 'recommended' && permitAllowanceData?.gasFee
        ? permitAllowanceData?.gasFee
        : new BigNumber(customFees || '0').multipliedBy(1e9).toFixed(0);
    const finalNonce = parseInt(customNonce, 10);
    onContinue({
      type: selectedType,
      gasFee: gasFeeWei,
      maxPriorityFeePerGas: permitAllowanceData?.maxPriorityFeePerGas,
      nonce: !isNaN(finalNonce) ? finalNonce : permitAllowanceData?.nonce,
      feesType: selectedFeesTypeRef.current,
      estimateGas: permitAllowanceData?.estimateGas,
    });
  }, [
    customFees,
    customNonce,
    onContinue,
    permitAllowanceData?.estimateGas,
    permitAllowanceData?.gasFee,
    permitAllowanceData?.maxPriorityFeePerGas,
    permitAllowanceData?.nonce,
    selectedFeesType,
    selectedType,
  ]);

  const onSuccess = useCallback(async () => {
    setShowConfirmModal(false);
    await delay(300);
    await submitTransferData();
  }, [submitTransferData]);

  const hideConfirmModal = useCallback(() => {
    setShowConfirmModal(false);
    // Resume refresh only if not on a custom fee (custom must stay local).
    isPauseCalculateFees.current = selectedFeesTypeRef.current === 'custom';
  }, []);

  const feesOptions = permitAllowanceData?.feesOptions;
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
    // ModalConfirmTransaction renders at MUI's default modal z-index (1300),
    // so while it is open this modal must sit just below it — the permit
    // content stays visible (dimmed) underneath, like mobile's stacked sheet.
    <Modal
      open={!!visible}
      onClose={onClose}
      sx={{zIndex: showConfirmModal ? 1299 : 99999}}>
      <Box sx={style}>
        <div className={s.container}>
          <div className={s.header}>
            <GppGoodIcon sx={{fontSize: 24, color: 'var(--background)'}} />
            <div className={s.title}>Router Permission</div>
          </div>

          {approveLoading ? (
            <div className={s.centerView}>
              <div className={s.spinner} />
              <p className={s.body}>Processing approval...</p>
            </div>
          ) : isLoading && !isFetchingFeesAgain ? (
            <div className={s.centerView}>
              <div className={s.spinner} />
              <p className={s.body}>Fetching permit allowance...</p>
            </div>
          ) : hasError ? (
            <div className={s.centerView}>
              <ErrorOutlineIcon sx={{fontSize: 48, color: 'var(--error)'}} />
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
              {permitAllowanceData ? (
                <div className={s.statusRow}>
                  {permitAllowanceData.isApproved ? (
                    <CheckCircleIcon
                      sx={{fontSize: 18, color: 'var(--success)'}}
                    />
                  ) : (
                    <ErrorOutlineIcon
                      sx={{fontSize: 18, color: 'var(--warning)'}}
                    />
                  )}
                  <span
                    className={`${s.statusText} ${
                      permitAllowanceData.isApproved
                        ? s.statusApproved
                        : s.statusPending
                    }`}>
                    {permitAllowanceData.isApproved
                      ? `Router allowance: ${parseFloat(
                          permitAllowanceData.permit2AmountFormatted || '0',
                        ).toFixed(6)}`
                      : `Router allowance required: ${parseFloat(
                          permitAllowanceData.requiredFormatted || '0',
                        ).toFixed(6)} (current: ${parseFloat(
                          permitAllowanceData.permit2AmountFormatted || '0',
                        ).toFixed(6)})`}
                  </span>
                </div>
              ) : null}

              <div className={s.sectionLabel}>Select Approval Type</div>
              <p className={s.whatIsApprove}>
                {`This lets the swap router use your ${
                  tokenSymbol || 'tokens'
                } through Permit2. Your tokens stay in your wallet until you swap.`}
              </p>

              <div className={s.cardsRow}>
                <button
                  className={`${s.card} ${
                    selectedType === 'manual' ? s.cardSelected : ''
                  }`}
                  onClick={() => setSelectedType('manual')}>
                  <div className={s.cardHeader}>
                    <EditIcon
                      sx={{
                        fontSize: 20,
                        color:
                          selectedType === 'manual'
                            ? 'var(--background)'
                            : 'var(--gray)',
                      }}
                    />
                    {selectedType === 'manual' ? (
                      <CheckCircleIcon
                        sx={{fontSize: 16, color: 'var(--background)'}}
                      />
                    ) : null}
                  </div>
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
                  <div className={s.cardHeader}>
                    <AllInclusiveIcon
                      sx={{
                        fontSize: 20,
                        color:
                          selectedType === 'unlimited'
                            ? 'var(--background)'
                            : 'var(--gray)',
                      }}
                    />
                    {selectedType === 'unlimited' ? (
                      <CheckCircleIcon
                        sx={{fontSize: 16, color: 'var(--background)'}}
                      />
                    ) : null}
                  </div>
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
                <>
                  <div className={s.selectionNote}>
                    {selectedType === 'unlimited' ? (
                      <WarningAmberIcon
                        sx={{fontSize: 16, color: 'var(--warning)'}}
                      />
                    ) : (
                      <GppGoodOutlinedIcon
                        sx={{fontSize: 16, color: 'var(--gray)'}}
                      />
                    )}
                    <p
                      className={
                        selectedType === 'unlimited'
                          ? s.noteWarning
                          : s.noteSafe
                      }>
                      {selectedType === 'unlimited'
                        ? `The swap router can move any amount of your ${
                            tokenSymbol || 'tokens'
                          } via Permit2 until you revoke it. Saves fees and time on future swaps — choose only for protocols you trust.`
                        : `Safest option. The router can only ever move this exact amount via Permit2 — you'll need to approve again for future swaps.`}
                    </p>
                  </div>
                  <p className={s.hint}>
                    Permit2 approval transaction will be submitted before
                    swapping.
                  </p>
                </>
              )}

              <div className={s.feeRow}>
                <span className={s.feeLabelRow}>
                  <LocalGasStationIcon
                    sx={{fontSize: 16, color: 'var(--background)'}}
                  />
                  <span className={s.feeLabel}>Network Fee</span>
                </span>
                <span className={s.feeValue}>
                  {isFetchingFeesAgain
                    ? 'Refreshing...'
                    : `${permitAllowanceData?.transactionFee || '0'} ${
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
              {onContinue ? (
                <button
                  className={s.primaryBtn}
                  disabled={isDisabled}
                  style={{
                    backgroundColor: isDisabled
                      ? 'var(--disabledButton)'
                      : undefined,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleContinue}>
                  Approve
                </button>
              ) : null}
              <button className={s.secondaryBtn} onClick={onClose}>
                Cancel
              </button>
            </div>
          )}

          <ModalConfirmTransaction
            visible={showConfirmModal}
            hideModal={hideConfirmModal}
            onSuccess={onSuccess}
          />
        </div>
      </Box>
    </Modal>
  );
};

export default ModalPermitInfo;
