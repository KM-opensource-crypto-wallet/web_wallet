'use client';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  isAdding50MoreAddresses,
  selectCurrentCoin,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import * as Yup from 'yup';
import s from './CustomDerivation.module.css';
import GeneralButton from 'components/Button';
import CoinIcon from 'components/CoinIcon';
import {ChevronLeftIcon, PlusIcon} from 'components/Home/HomeIcons';
import {
  allDerivePath,
  customObj,
  getCustomizePublicAddress,
  isBitcoinChain,
  isEVMChain,
  isValidDerivePath,
  validateSupportedChain,
  DERIVATION_CONFIG,
} from 'dok-wallet-blockchain-networks/helper';
import SelectInputExchange from 'components/SelectInputExchange';
import {useFormik} from 'formik';
import {useRouter} from 'next/navigation';
import AddressTypeBadge from 'components/AddressTypeBadge';
import CustomDerivationPopOver from 'components/CustomDerivationPopOver';
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

const CustomDerivation = () => {
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

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.back}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <div className={s.titleBlock}>
          <h1 className={s.title}>Custom derivation</h1>
          <span className={s.subtitle}>
            {currentCoin?.name} ({currentCoin?.symbol})
          </span>
        </div>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>
      <div className={s.column}>
        <form className={s.card} onSubmit={handleSubmit} noValidate>
          <h2 className={s.cardHeading}>Add an address</h2>
          <div className={s.field}>
            <span className={s.label}>Derivation path</span>
            <div className={s.selectBox}>
              <SelectInputExchange
                listData={derivationData}
                onValueChange={onChangeDerivePath}
                selectedValue={values.selectedDerivationOptions}
                placeholder={'Select derive path'}
              />
            </div>
          </div>

          {isCustom && (
            <div className={s.field}>
              <label htmlFor='customDerivePath' className={s.label}>
                Custom path
              </label>
              <div
                className={`${s.inputBox} ${
                  customPathError ? s.inputBoxError : ''
                }`}>
                <input
                  id='customDerivePath'
                  className={s.input}
                  name='customDerivePath'
                  autoComplete='off'
                  spellCheck={false}
                  onChange={handleChange('customDerivePath')}
                  onBlur={handleBlur('customDerivePath')}
                  value={values.customDerivePath}
                  placeholder="m/44'/60'/0'/0/0"
                />
              </div>
              {customPathError ? (
                <p className={s.error} role='alert'>
                  {errors.customDerivePath}
                </p>
              ) : null}
            </div>
          )}

          {isAtLimit && (
            <p className={s.alert} role='alert'>
              Maximum limit of 100 accounts reached.
            </p>
          )}

          <GeneralButton
            type='submit'
            fullWidth
            disabled={isButtonDisabled}
            loading={isSubmitting}
            loadingLabel='Adding…'>
            Add address
          </GeneralButton>
        </form>

        {!isBitcoinChain(currentCoin?.chain_name) && (
          <GeneralButton
            variant='secondary'
            fullWidth
            className={s.add50}
            loading={isAdding50more}
            loadingLabel='Adding addresses…'
            onClick={onAdd50MoreAddresses}>
            <PlusIcon size={18} />
            Add 50 more addresses
          </GeneralButton>
        )}

        <section className={s.accounts} aria-label='All accounts'>
          <div className={s.accountsHeader}>
            <h2 className={s.accountsTitle}>
              All accounts
              <span className={s.count}>{allDeriveAddress.length}</span>
            </h2>
            <GeneralButton
              variant='chip'
              className={s.exportChip}
              disabled={!allDeriveAddress.length}
              onClick={() => {
                downloadCsv(
                  allDeriveAddress.map(item => ({
                    address: item.address,
                    derivePath: item.derivePath,
                  })),
                );
              }}>
              Export CSV
            </GeneralButton>
          </div>

          <ul className={s.accountList}>
            {allDeriveAddress.map((item, index) => {
              const isSelected = item?.address === currentCoin?.address;
              return (
                <li
                  key={`custom-address${index?.toString()}`}
                  className={`${s.account} ${
                    isSelected ? s.accountSelected : ''
                  }`}>
                  <span className={s.accountIcon}>
                    <CoinIcon item={currentCoin} />
                  </span>
                  <div className={s.accountMain}>
                    <div className={s.accountTop}>
                      <span className={s.path}>
                        {item?.derivePath || 'default'}
                      </span>
                      <AddressTypeBadge
                        chain_name={currentCoin?.chain_name}
                        item={item}
                      />
                      {isSelected && (
                        <span className={s.selectedPill}>Selected</span>
                      )}
                    </div>
                    <span className={s.address} title={item?.address}>
                      {getCustomizePublicAddress(item?.address)}
                    </span>
                  </div>
                  <div className={s.menu}>
                    <CustomDerivationPopOver selectedItem={item} />
                  </div>
                </li>
              );
            })}
          </ul>
          {allDeriveAddress.length === 0 && (
            <p className={s.empty}>No addresses yet</p>
          )}
        </section>
      </div>
    </main>
  );
};

export default CustomDerivation;
