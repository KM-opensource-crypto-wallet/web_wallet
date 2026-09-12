import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import BigNumber from 'bignumber.js';
import {useDispatch, useSelector} from 'react-redux';
import {
  getTransferData,
  getTransferDataFeesOptions,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSelector';
import {updateFees} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {
  GAS_CURRENCY,
  isEip1559Chain,
  validateNumberInInput,
  weiToGwei,
} from 'dok-wallet-blockchain-networks/helper';

const DEFAULT_FEES_TYPE = 'recommended';
// Both custom inputs are denominated in gwei regardless of the coin's decimals.
const GWEI_DECIMALS = 9;

/**
 * Fee-option state for the Transfer screen's AdvancedFeesSheet.
 *
 * Owns the selected preset / custom gas price (maxFeePerGas on EIP-1559
 * chains), custom priority fee and custom nonce, keeps them seeded from the
 * latest estimate while the user has not overridden them, and pushes edits
 * into the currentTransfer slice via `updateFees`.
 *
 * @param {object} params
 * @param {string} params.chainName        raw chain name of the coin being sent
 * @param {string} params.convertedChainName 'ethereum' for every EVM chain
 * @param {React.MutableRefObject<boolean>} params.isPauseCalculateFees
 *        polling guard owned by Transfer; custom mode pauses re-estimation
 */
const useAdvancedFees = ({
  chainName,
  convertedChainName,
  isPauseCalculateFees,
}) => {
  const dispatch = useDispatch();
  const transferData = useSelector(getTransferData);
  const feesOptions = useSelector(getTransferDataFeesOptions);

  const [selectedFeesType, setSelectedFeesType] = useState(DEFAULT_FEES_TYPE);
  const selectedFeesTypeRef = useRef(DEFAULT_FEES_TYPE);
  const [customFees, setCustomFees] = useState('');
  const [customPriorityFee, setCustomPriorityFee] = useState('');
  const [customNonce, setCustomNonce] = useState('');

  const isEip1559 = isEip1559Chain(chainName);
  const gasCurrency = GAS_CURRENCY[convertedChainName] || 'Gwei';

  // Like the tip below, seed the gas price only while a preset is active so
  // the user's typed custom value survives polling updates.
  useEffect(() => {
    if (selectedFeesTypeRef.current === 'custom') {
      return;
    }
    if (feesOptions?.[0]?.gasPrice) {
      setCustomFees(feesOptions?.[0]?.gasPrice);
    }
  }, [feesOptions]);

  // Seed the tip from the market estimate only while a preset is active;
  // in custom mode the user's typed value must survive polling updates.
  useEffect(() => {
    if (selectedFeesTypeRef.current === 'custom') {
      return;
    }
    const gwei = weiToGwei(transferData?.maxPriorityFeePerGas);
    if (gwei != null) {
      setCustomPriorityFee(gwei);
    }
  }, [transferData?.maxPriorityFeePerGas]);

  useEffect(() => {
    if (transferData?.nonce !== undefined && transferData?.nonce !== null) {
      setCustomNonce(String(transferData.nonce));
    }
  }, [transferData?.nonce]);

  const setFeesType = useCallback(
    type => {
      setSelectedFeesType(type);
      selectedFeesTypeRef.current = type;
      isPauseCalculateFees.current = type === 'custom';
    },
    [isPauseCalculateFees],
  );

  const onSelectFeesType = useCallback(
    (type, gasPrice) => {
      setFeesType(type);
      // Presets pass no tip, so the slice keeps the market tip from the
      // latest estimate and the next poll refreshes both cap and tip.
      if (type !== 'custom' && gasPrice) {
        dispatch(updateFees({gasPrice, convertedChainName}));
      }
    },
    [dispatch, convertedChainName, setFeesType],
  );

  const dispatchCustomFees = useCallback(
    (gasPrice, maxPriorityFeePerGas) => {
      dispatch(
        updateFees({
          gasPrice: gasPrice || '0',
          convertedChainName,
          ...(isEip1559 && maxPriorityFeePerGas !== ''
            ? {maxPriorityFeePerGas}
            : {}),
        }),
      );
    },
    [dispatch, convertedChainName, isEip1559],
  );

  // Both inputs are kept exactly as typed (MetaMask-style). The EIP-1559
  // invariant maxFeePerGas >= maxPriorityFeePerGas is surfaced as
  // `customFeesError` below and gates Done/Confirm; the slice and the signer
  // still clamp the dispatched tip so the displayed estimate stays sane while
  // the error is showing.
  const onChangeCustomFees = useCallback(
    text => {
      const maxFee = validateNumberInInput(text, GWEI_DECIMALS) || '0';
      setCustomFees(maxFee);
      dispatchCustomFees(maxFee, customPriorityFee);
    },
    [dispatchCustomFees, customPriorityFee],
  );

  const onChangeCustomPriorityFee = useCallback(
    text => {
      const tip = validateNumberInInput(text, GWEI_DECIMALS) || '';
      setCustomPriorityFee(tip);
      dispatchCustomFees(customFees, tip);
    },
    [dispatchCustomFees, customFees],
  );

  const customFeesError = useMemo(() => {
    if (
      selectedFeesType !== 'custom' ||
      !isEip1559 ||
      customPriorityFee === ''
    ) {
      return null;
    }
    return new BigNumber(customPriorityFee).gt(new BigNumber(customFees || '0'))
      ? 'Priority fee cannot be higher than max fee'
      : null;
  }, [selectedFeesType, isEip1559, customPriorityFee, customFees]);
  const isCustomFeesValid = customFeesError == null;

  const onChangeCustomNonce = useCallback(text => {
    setCustomNonce(text.replace(/[^0-9]/g, ''));
  }, []);

  // customNonce is a string and is '' until the estimated nonce arrives, which
  // would defeat the `?? transferData.nonce` fallbacks in the send thunks.
  // Normalise once here so every branch receives a number or undefined.
  const finalNonce = useMemo(() => {
    const parsed = Number(customNonce);
    return customNonce === '' || isNaN(parsed) ? undefined : parsed;
  }, [customNonce]);

  const selectedFeesLabel = useMemo(() => {
    if (selectedFeesType === 'custom') {
      const tip =
        isEip1559 && customPriorityFee ? ` / Tip ${customPriorityFee}` : '';
      return `Custom: ${customFees}${tip} ${gasCurrency}`;
    }
    const selectedOption = feesOptions?.find(
      opt => opt?.title?.toLowerCase() === selectedFeesType?.toLowerCase(),
    );
    if (selectedOption) {
      return `${selectedOption.title}: ${selectedOption.gasPrice} ${gasCurrency}`;
    }
    return 'Recommended';
  }, [
    selectedFeesType,
    customFees,
    customPriorityFee,
    feesOptions,
    gasCurrency,
    isEip1559,
  ]);

  const sheetProps = {
    feesOptions,
    selectedFeesType,
    customFees,
    customNonce,
    chainName: convertedChainName,
    gasCurrency,
    onSelectFeesType,
    onChangeCustomFees,
    onChangeCustomNonce,
    isEip1559,
    customPriorityFee,
    onChangeCustomPriorityFee,
    baseFeePerGas: transferData?.baseFeePerGas,
    customFeesError,
  };

  return {
    sheetProps,
    feesOptions,
    isEip1559,
    selectedFeesType,
    selectedFeesTypeRef,
    selectedFeesLabel,
    customNonce,
    finalNonce,
    isCustomFeesValid,
  };
};

export default useAdvancedFees;
