import {useCallback, useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {useFormik} from 'formik';
import * as Yup from 'yup';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import {
  isAdding50MoreAddresses,
  selectCurrentCoin,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  allDerivePath,
  customObj,
  isBitcoinChain,
  isEVMChain,
  isValidDerivePath,
  validateSupportedChain,
  DERIVATION_CONFIG,
} from 'dok-wallet-blockchain-networks/helper';
import {
  add50AddressesOnCurrentCoin,
  addCustomDeriveAddress,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {downloadCsv} from 'utils/common';

const generatePaths = (chain, label) => {
  const config = DERIVATION_CONFIG[chain];
  if (!config) return [];

  const type = Object.keys(config).find(key => label?.includes(key));
  if (!type) return [];

  return Array.from({length: 50}, (_, j) => {
    const path = config[type](j + 1);
    return {
      label: `${type} (${path})`,
      value: path,
    };
  });
};

// Logic for the Custom Derivation screen.
export const useCustomDerivation = () => {
  const currentCoin = useSelector(selectCurrentCoin);
  const isAdding50more = useSelector(isAdding50MoreAddresses);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const routes = useAppRoutes();
  const dispatch = useDispatch();

  const derivationData = useMemo(() => {
    const chainName = currentCoin?.chain_name;
    if (!validateSupportedChain(chainName)) {
      return [customObj];
    }
    const convertedChainName = isEVMChain(chainName) ? 'ethereum' : chainName;
    const availableDerivePath = allDerivePath[convertedChainName] || [];
    const make50DerivePath = availableDerivePath.flatMap(item =>
      generatePaths(convertedChainName, item?.label),
    );
    return [customObj, ...make50DerivePath];
  }, [currentCoin?.chain_name]);

  const allDeriveAddress = useMemo(() => {
    const addresses = Array.isArray(currentCoin?.deriveAddresses)
      ? currentCoin?.deriveAddresses
      : [];

    const sortedAddresses = [...addresses].sort((a, b) => {
      // First, prioritize the active address (currently selected)
      if (a?.address === currentCoin?.address) {
        return -1;
      }
      if (b?.address === currentCoin?.address) {
        return 1;
      }

      // Then sort by derivation path numerically for better ordering
      const parseDerivationPath = derivePath => {
        if (!derivePath) {
          return [];
        }
        // Extract all numbers from the derivation path and convert to integers
        const numbers = derivePath.match(/\d+/g);
        return numbers ? numbers.map(num => parseInt(num, 10)) : [];
      };

      const pathA = parseDerivationPath(a?.derivePath);
      const pathB = parseDerivationPath(b?.derivePath);

      // Compare each number in the path from left to right
      const maxLength = Math.max(pathA.length, pathB.length);
      for (let i = 0; i < maxLength; i++) {
        const numA = pathA[i] || 0;
        const numB = pathB[i] || 0;

        if (numA !== numB) {
          return numA - numB;
        }
      }

      // If all numbers are equal, sort by string comparison as fallback
      const pathStringA = a?.derivePath || '';
      const pathStringB = b?.derivePath || '';
      return pathStringA.localeCompare(pathStringB);
    });
    return sortedAddresses;
  }, [currentCoin?.address, currentCoin?.deriveAddresses]);

  useEffect(() => {
    if (!currentCoin) {
      router.replace(routes.wallet.home());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCoin]);

  const {
    values,
    errors,
    setFieldError,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
  } = useFormik({
    enableReinitialize: true,
    initialValues: {selectedDerivationOptions: '', customDerivePath: ''},
    validationSchema: Yup.object().shape({
      selectedDerivationOptions: Yup.string().required(
        'Derivation Options is required',
      ),
    }),
    onSubmit: async submittedValue => {
      try {
        if (!validateSupportedChain(currentCoin?.chain_name)) {
          return;
        }
        setIsSubmitting(true);
        const {selectedDerivationOptions, customDerivePath} = submittedValue;
        const chainName = isEVMChain(currentCoin?.chain_name)
          ? 'ethereum'
          : currentCoin?.chain_name;
        const derivePath =
          selectedDerivationOptions === 'custom'
            ? customDerivePath?.trim()?.replace(/[’`‘]/g, "'")
            : selectedDerivationOptions;
        if (isValidDerivePath(derivePath)) {
          const payload = {
            derivePath,
            chain_name: chainName,
          };
          await dispatch(addCustomDeriveAddress(payload)).unwrap();
        } else {
          setFieldError('customDerivePath', 'Invalid derive path');
        }
        setIsSubmitting(false);
      } catch (err) {
        setIsSubmitting(false);
        console.error('Error in submit custom derivation', err);
      }
    },
  });

  // Cap counts only user-created custom derivations, matching the reducer-side
  // check in walletsSlice -- automatic gap-limit discovery can legitimately
  // grow the full list past 100.
  const isAtLimit =
    isBitcoinChain(currentCoin?.chain_name) &&
    (currentCoin?.deriveAddresses?.filter(item => item?.isCustom)?.length ??
      0) >= 100;

  const onAdd50MoreAddresses = useCallback(async () => {
    try {
      dispatch(add50AddressesOnCurrentCoin());
    } catch (err) {
      console.error('Error in submit custom derivation', err);
    }
  }, [dispatch]);

  const onChangeDerivePath = useCallback(
    event => {
      const value = event.target.value;
      setFieldValue('selectedDerivationOptions', value);
    },
    [setFieldValue],
  );
  const isCustom = values.selectedDerivationOptions === 'custom';
  const isButtonDisabled =
    !values.selectedDerivationOptions || isSubmitting || isAtLimit;

  const customPathError = touched.customDerivePath && errors.customDerivePath;

  const exportCsv = () => {
    downloadCsv(
      allDeriveAddress.map(item => ({
        address: item.address,
        derivePath: item.derivePath,
      })),
    );
  };

  return {
    goBack: () => router.back(),
    currentCoin,

    // Add-an-address form
    derivationData,
    values,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    onChangeDerivePath,
    isCustom,
    customPathError,
    isAtLimit,
    isButtonDisabled,
    isSubmitting,

    // Add 50 more
    showAdd50: !isBitcoinChain(currentCoin?.chain_name),
    isAdding50more,
    onAdd50MoreAddresses,

    // Accounts list
    allDeriveAddress,
    exportCsv,
  };
};

export default useCustomDerivation;
