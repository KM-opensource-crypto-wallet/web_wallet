'use client';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  isAdding50MoreAddresses,
  selectCurrentCoin,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import * as Yup from 'yup';
import s from './CustomDerivation.module.css';
import GoBackButton from 'components/GoBackButton';
import {
  allDerivePath,
  customObj,
  getCustomizePublicAddress,
  isEVMChain,
  isValidDerivePath,
} from 'dok-wallet-blockchain-networks/helper';
import SelectInputExchange from 'components/SelectInputExchange';
import {useFormik} from 'formik';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import CustomDerivationPopOver from 'components/CustomDerivationPopOver';
import {
  add50AddressesOnCurrentCoin,
  addCustomDeriveAddress,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {downloadCsv} from 'utils/common';

const CustomDerivation = () => {
  const currentCoin = useSelector(selectCurrentCoin);
  const isAdding50more = useSelector(isAdding50MoreAddresses);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const headerDivOffset = useRef(0);
  const dispatch = useDispatch();

  const derivationData = useMemo(() => {
    const chainName = currentCoin?.chain_name;
    const convertedChainName = isEVMChain(chainName) ? 'ethereum' : chainName;
    const availableDerivePath = allDerivePath[convertedChainName] || [];
    const make50DerivePath = [];
    for (let i = 0; i < availableDerivePath.length; i++) {
      for (let j = 1; j <= 50; j++) {
        if (
          convertedChainName === 'ethereum' &&
          availableDerivePath[i]?.label?.includes('Ledger')
        ) {
          make50DerivePath.push({
            label: `Ledger (m/44'/60'/${j}'/0/0)`,
            value: `m/44'/60'/${j}'/0/0`,
          });
        } else if (
          convertedChainName === 'ethereum' &&
          availableDerivePath[i]?.label?.includes('Metamask')
        ) {
          make50DerivePath.push({
            label: `Metamask (m/44'/60'/0'/0/${j})`,
            value: `m/44'/60'/0'/0/${j}`,
          });
        } else if (
          convertedChainName === 'solana' &&
          availableDerivePath[i]?.label?.includes('Ledger')
        ) {
          make50DerivePath.push({
            label: `Ledger (m/44'/501'/${j}')`,
            value: `m/44'/501'/${j}'`,
          });
        } else if (
          convertedChainName === 'tron' &&
          availableDerivePath[i]?.label?.includes('Ledger')
        ) {
          make50DerivePath.push({
            label: `Ledger (m/44'/195'/${j}'/0/0)`,
            value: `m/44'/195'/${j}'/0/0`,
          });
        }
      }
    }
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
      router.replace('/home');
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

  const onAdd50MoreAddresses = useCallback(async () => {
    try {
      dispatch(add50AddressesOnCurrentCoin());
    } catch (err) {
      console.error('Error in submit custom derivation', err);
    }
  }, [dispatch]);

  useEffect(() => {
    const header = document.getElementById('myHeader');
    const offset = header.offsetTop - 30;
    if (offset > 100) {
      headerDivOffset.current = offset;
    }
  }, [values.selectedDerivationOptions]);

  const onChangeDerivePath = useCallback(
    event => {
      const value = event.target.value;
      setFieldValue('selectedDerivationOptions', value);
    },
    [setFieldValue],
  );
  const isCustom = values.selectedDerivationOptions === 'custom';
  const isButtonDisabled = !values.selectedDerivationOptions || isSubmitting;

  return (
    <div
      className={s.container}
      onScroll={event => {
        const scrollTop = event.currentTarget.scrollTop;
        const sticky = headerDivOffset.current;
        const header = document.getElementById('myHeader');
        if (scrollTop > sticky) {
          header.classList.add(s.sticky);
        } else {
          header.classList.remove(s.sticky);
        }
      }}>
      <div className={s.goBack}>
        <GoBackButton />
        <button
          className={s.buttonAdd50}
          onClick={onAdd50MoreAddresses}
          style={
            isAdding50more
              ? {
                  backgroundColor: 'var(--gray)',
                  cursor: 'not-allowed',
                  pointerEvents: 'all !important',
                }
              : {}
          }
          disabled={isAdding50more}>
          Add 50 more addresses
        </button>
      </div>
      <form className={s.inputContainer} onSubmit={handleSubmit}>
        <div className={s.dropdownContainer}>
          <SelectInputExchange
            listData={derivationData}
            onValueChange={onChangeDerivePath}
            selectedValue={values.selectedDerivationOptions}
            placeholder={'Select Derive path'}
          />
        </div>
        <div className={!isCustom && s.hideModule}>
          <FormControl variant='outlined' fullWidth>
            <InputLabel
              sx={{
                color:
                  errors.customDerivePath && touched.customDerivePath
                    ? 'red'
                    : 'var(--borderActiveColor)',
              }}
              focused={false}>
              Derive Path
            </InputLabel>
            <OutlinedInput
              fullWidth
              className={s.input}
              id='customDerivePath'
              type={'customDerivePath'}
              name='customDerivePath'
              onChange={handleChange('customDerivePath')}
              onBlur={handleBlur('customDerivePath')}
              value={values.customDerivePath}
              placeholder='Enter Derive Path'
              label='Derive Path'
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor:
                    errors.customDerivePath && touched.customDerivePath
                      ? 'red'
                      : 'var(--sidebarIcon)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor:
                    errors.customDerivePath && touched.customDerivePath
                      ? 'red'
                      : 'var(--borderActiveColor)',
                },
                '& .MuiInputLabel-outlined': {
                  color:
                    errors.customDerivePath && touched.customDerivePath
                      ? 'red'
                      : 'var(--sidebarIcon)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--sidebarIcon) !important',
                },
              }}
            />
          </FormControl>
        </div>
        {errors.customDerivePath && touched.customDerivePath && (
          <p className={s.textConfirm}>{errors.customDerivePath}</p>
        )}
        <button
          className={s.button}
          type={'submit'}
          style={
            !!isButtonDisabled
              ? {
                  backgroundColor: 'var(--gray)',
                  cursor: 'not-allowed',
                  pointerEvents: 'all !important',
                }
              : {}
          }
          disabled={isButtonDisabled}>
          Add
        </button>
      </form>
      <div className={s.deriveAddressHeader} id={'myHeader'}>
        <p className={s.deriveAddressTitle}>{'All Accounts'}</p>
        <button
          className={s.exportButton}
          onClick={() => {
            downloadCsv(
              allDeriveAddress.map(item => ({
                address: item.address,
                derivePath: item.derivePath,
              })),
            );
          }}>
          <p className={s.deriveAddressTitle}>{'Export addresses'}</p>
        </button>
      </div>
      <div className={s.itemContainer}>
        {allDeriveAddress.map((item, index) => (
          <div
            key={`custom-address${index?.toString()}`}
            className={s.mainItem}>
            <Image
              className={s.iconBox}
              src={currentCoin?.icon}
              alt={'icon'}
              width={39}
              height={39}
            />

            <div className={s.list}>
              <div className={s.box}>
                <div className={s.item}>
                  <div className={s.rowStyle}>
                    <p className={s.title}>{item?.derivePath || 'default'}</p>
                    {item?.address === currentCoin?.address && (
                      <p className={s.chainDisplayName}>{'selected'}</p>
                    )}
                  </div>
                  <p className={s.text} title={item?.address}>
                    {getCustomizePublicAddress(item?.address)}
                  </p>
                </div>
              </div>
              <CustomDerivationPopOver selectedItem={item} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomDerivation;
