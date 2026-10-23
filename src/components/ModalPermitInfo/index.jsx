'use client';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Modal from '@mui/material/Modal';
import {useDispatch, useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
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
import GeneralButton from 'components/Button';
import s from './ModalPermitInfo.module.css';

// Line icon on a 24px grid; stroke follows currentColor.
const Icon = ({size = 22, strokeWidth = 2, children}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={strokeWidth}
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'>
    {children}
  </svg>
);

const ShieldGlyph = () => (
  <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
);

const AlertGlyph = () => (
  <>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 8v4.5' />
    <path d='M12 16h.01' />
  </>
);

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
// (swapData.permit_abi is present). Bottom sheet on phones, centred dialog
// from 600px up.
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
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      if (visible) {
        setSelectedType('manual');
        setSelectedFeesType('recommended');
        selectedTypeRef.current = 'manual';
        selectedFeesTypeRef.current = 'recommended';
        isPauseCalculateFees.current = false;
        setHasError(false);
        setShowAdvanced(false);
      }
    })();
  }, [visible]);

  // Sync nonce input when permitAllowanceData updates, and clear it when the
  // modal closes so a reopen never submits a stale (possibly user-edited)
  // nonce from the previous session.
  useEffect(() => {
    // see comment on the first wrapped effect above
    (() => {
      if (!visible) {
        setCustomNonce('');
        customNonceRef.current = '';
        return;
      }

      const nonce =
        permitAllowanceData?.nonce != null
          ? String(permitAllowanceData.nonce)
          : '';
      setCustomNonce(nonce);
      customNonceRef.current = nonce;
    })();
  }, [visible, permitAllowanceData?.nonce]);

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

  const transactionFee = permitAllowanceData?.transactionFee;
  const isInsufficientFeeBalance = useMemo(
    () =>
      nativeBalance != null &&
      transactionFee != null &&
      isBalanceNotAvailable(nativeBalance, transactionFee),
    [nativeBalance, transactionFee],
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

  return (
    // ModalConfirmTransaction renders at MUI's default modal z-index (1300),
    // so while it is open this modal must sit just below it — the permit
    // content stays visible (dimmed) underneath, like mobile's stacked sheet.
    <Modal
      open={!!visible}
      onClose={onClose}
      sx={{zIndex: showConfirmModal ? 1299 : 99999}}
      aria-labelledby='modal-permit-title'
      slotProps={{backdrop: {className: s.backdrop}}}>
      <div className={s.sheet}>
        <div className={s.handle} />
        <div className={s.header}>
          <span className={s.tile}>
            <Icon>
              <ShieldGlyph />
              <path d='m9 12 2 2 4-4' />
            </Icon>
          </span>
          <div id='modal-permit-title' className={s.title}>
            Router Permission
          </div>
        </div>

        {approveLoading ? (
          <div className={s.centerView} role='status'>
            <div className={s.spinner} />
            <p className={s.body}>Processing approval...</p>
          </div>
        ) : isLoading && !isFetchingFeesAgain ? (
          <div className={s.centerView} role='status'>
            <div className={s.spinner} />
            <p className={s.body}>Fetching permit allowance...</p>
          </div>
        ) : hasError ? (
          <div className={s.centerView}>
            <span className={`${s.tile} ${s.tileDanger}`}>
              <Icon>
                <AlertGlyph />
              </Icon>
            </span>
            <p className={s.errorTitle}>Something went wrong</p>
            <p className={s.body}>
              We couldn&apos;t estimate the network fee right now. Please check
              your connection and try again.
            </p>
            <GeneralButton
              variant='secondary'
              fullWidth
              onClick={fetchEstimationFee}>
              Retry
            </GeneralButton>
          </div>
        ) : (
          <>
            {permitAllowanceData ? (
              <div
                className={`${s.statusText} ${s.statusRow} ${
                  permitAllowanceData.isApproved
                    ? s.statusApproved
                    : s.statusPending
                }`}>
                {permitAllowanceData.isApproved ? (
                  <Icon size={16} strokeWidth={2.4}>
                    <circle cx='12' cy='12' r='9' />
                    <path d='m8.5 12 2.5 2.5 4.5-5' />
                  </Icon>
                ) : (
                  <Icon size={16} strokeWidth={2.4}>
                    <AlertGlyph />
                  </Icon>
                )}
                <span>
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

            <div className={s.section}>
              <div className={s.sectionLabel}>Select Approval Type</div>
              <p className={s.whatIsApprove}>
                {`This lets the swap router use your ${
                  tokenSymbol || 'tokens'
                } through Permit2. Your tokens stay in your wallet until you swap.`}
              </p>
            </div>

            <div className={s.cardsRow}>
              <button
                type='button'
                aria-pressed={selectedType === 'manual'}
                className={`${s.card} ${
                  selectedType === 'manual' ? s.cardSelected : ''
                }`}
                onClick={() => setSelectedType('manual')}>
                <span className={s.cardHeader}>
                  <span className={s.cardIcon}>
                    <Icon size={18}>
                      <path d='M12 20h9' />
                      <path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' />
                    </Icon>
                  </span>
                  <span className={s.cardCheck} aria-hidden='true'>
                    <Icon size={11} strokeWidth={3.2}>
                      <path d='M20 6 9 17l-5-5' />
                    </Icon>
                  </span>
                </span>
                <div className={s.cardTitle}>Manual</div>
                <div className={s.cardDesc}>Approve only this amount</div>
                <div className={s.cardAmount}>
                  {parseFloat(displayRequiredAmount).toFixed(6)}
                </div>
                <div className={s.cardSymbol}>{tokenSymbol || ''}</div>
              </button>

              <button
                type='button'
                aria-pressed={selectedType === 'unlimited'}
                className={`${s.card} ${
                  selectedType === 'unlimited' ? s.cardSelected : ''
                }`}
                onClick={() => setSelectedType('unlimited')}>
                <span className={s.cardHeader}>
                  <span className={s.cardIcon}>
                    <Icon size={18}>
                      <path d='M18.2 8.4a5 5 0 1 1 0 7.2L12 9.6 5.8 15.6a5 5 0 1 1 0-7.2L12 14.4z' />
                    </Icon>
                  </span>
                  <span className={s.cardCheck} aria-hidden='true'>
                    <Icon size={11} strokeWidth={3.2}>
                      <path d='M20 6 9 17l-5-5' />
                    </Icon>
                  </span>
                </span>
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
                <div
                  className={`${s.selectionNote} ${
                    selectedType === 'unlimited' ? s.selectionNoteWarning : ''
                  }`}>
                  {selectedType === 'unlimited' ? (
                    <Icon size={16}>
                      <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
                      <path d='M12 9v4' />
                      <path d='M12 17h.01' />
                    </Icon>
                  ) : (
                    <Icon size={16}>
                      <ShieldGlyph />
                    </Icon>
                  )}
                  <p
                    className={
                      selectedType === 'unlimited' ? s.noteWarning : s.noteSafe
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
                <Icon size={16}>
                  <path d='M3 22V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17' />
                  <path d='M2 22h13' />
                  <path d='M3 10h11' />
                  <path d='M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9l-3-3' />
                </Icon>
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
              <GeneralButton
                variant='unstyled'
                aria-expanded={showAdvanced}
                className={s.advancedToggle}
                onClick={() => setShowAdvanced(prev => !prev)}>
                {showAdvanced ? 'Hide advanced' : 'Advanced options'}
                <Icon size={14} strokeWidth={2.4}>
                  <path d={showAdvanced ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
                </Icon>
              </GeneralButton>
            )}

            {showAdvanced && !!feesOptions?.length && (
              <div className={s.advancedBox}>
                <div className={s.feesOptionsRow}>
                  {feesOptions?.slice(0, 2).map(option => (
                    <button
                      type='button'
                      key={option?.title}
                      aria-pressed={
                        selectedFeesType?.toLowerCase() ===
                        option?.title?.toLowerCase()
                      }
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
                    type='button'
                    aria-pressed={selectedFeesType?.toLowerCase() === 'custom'}
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
                    <label
                      htmlFor='permit-gas-price'
                      className={
                        s.customLabel
                      }>{`Gas Price (${gasCurrency})`}</label>
                    <input
                      id='permit-gas-price'
                      className={s.customInput}
                      type='number'
                      value={customFees}
                      onChange={onChangeCustomFees}
                    />
                  </div>
                )}
                <div className={s.customInputRow}>
                  <label htmlFor='permit-nonce' className={s.customLabel}>
                    Nonce
                  </label>
                  <input
                    id='permit-nonce'
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
            <GeneralButton variant='secondary' fullWidth onClick={onClose}>
              Cancel
            </GeneralButton>
            {onContinue ? (
              <GeneralButton
                fullWidth
                disabled={isDisabled}
                onClick={handleContinue}>
                Approve
              </GeneralButton>
            ) : null}
          </div>
        )}

        <ModalConfirmTransaction
          visible={showConfirmModal}
          hideModal={hideConfirmModal}
          onSuccess={onSuccess}
        />
      </div>
    </Modal>
  );
};

export default ModalPermitInfo;
