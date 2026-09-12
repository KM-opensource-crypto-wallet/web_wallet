'use client';
import styles from './OTC2Screen.module.css';
import React, {useContext, useState, useCallback, useMemo} from 'react';
import SelectInputExchange from 'components/SelectInputExchange';
import {Checkbox} from '@mui/material';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import CryptoCheckbox from 'components/CheckBox';
import {useParams, useRouter} from 'next/navigation';
import GoBackButton from 'components/GoBackButton';

import {shallowEqual, useSelector} from 'react-redux';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {addOTC} from 'dok-wallet-blockchain-networks/service/dokApi';
import {getUserCoinsOptions} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {ThemeContext} from 'theme/ThemeContext';
import {getOTCData} from 'dok-wallet-blockchain-networks/redux/extraData/extraSelectors';
import {currencyIcon} from 'data/currency';
import {toast} from 'react-toastify';
import {getAppIcon, getAppIconDark} from 'whitelabel/whiteLabelInfo';

const amountOptions = [
  {
    label: '5,000 to 10,000',
    value: '5,000 to 10,000',
  },
  {
    label: '10,000 to 20,000',
    value: '10,000 to 20,000',
  },
  {
    label: '20,000 to 50,000',
    value: '20,000 to 50,000',
  },
  {
    label: '50,000 to 100,000',
    value: '50,000 to 100,000',
  },
  {
    label: 'More than 100,000',
    value: 'More than 100,000',
  },
];
const sourceOfFundList = [
  {label: 'Employment'},
  {label: 'Investment'},
  {label: 'Other'},
];

const OTC2Screen = () => {
  const [state, setState] = useState({
    isBuy: true,
    selectedCryptoCoin: {},
    selectedAmount: '',
    sourceOfFund: '',
    terms: false,
    risk: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {themeType} = useContext(ThemeContext);
  const router = useRouter();
  const {clientId} = useParams();

  const coinOptions = useSelector(getUserCoinsOptions, shallowEqual);
  const otcData = useSelector(getOTCData);

  const localCurrency = useSelector(getLocalCurrency);

  const otherOptions = {
    label: 'Other',
    value: 'Other',
    options: {
      icon: themeType === 'light' ? getAppIcon() : getAppIconDark(),
      title: 'Other',
    },
  };

  const finalAmountOptions = useMemo(() => {
    return amountOptions.map(item => ({
      ...item,
      options: {
        icon: currencyIcon[localCurrency],
      },
    }));
  }, [localCurrency]);

  const [dropDownList, setDropDownList] = useState(
    Array.isArray(coinOptions)
      ? [...coinOptions, otherOptions]
      : [otherOptions],
  );

  const onChangeCryptoCoin = useCallback(
    event => {
      const value = event.target.value;

      const foundItem = dropDownList.find(item => item.value === value);
      if (foundItem) {
        setState(prevState => ({
          ...prevState,
          selectedCryptoCoin: foundItem,
        }));
      }
    },
    [dropDownList],
  );

  const onChangeAmount = useCallback(event => {
    const value = event.target.value;
    setState(prevState => ({
      ...prevState,
      selectedAmount: value,
    }));
  }, []);

  const onSubmit = useCallback(async () => {
    const toastId = toast.loading('OTC Request Submitting', {
      autoClose: false,
    });
    try {
      const previousOTCData = otcData;
      if (previousOTCData) {
        setIsSubmitting(true);
        const postCode = previousOTCData?.zipcode;
        const payload = {
          fullName: previousOTCData?.fullname,
          email: previousOTCData?.email,
          address1: previousOTCData?.address1,
          city: previousOTCData?.city,
          postCode: postCode,
          country: previousOTCData?.country,
          fundSource: state?.sourceOfFund?.toLowerCase(),
          chain: state?.selectedCryptoCoin?.options?.chain_name,
          asset: state?.selectedCryptoCoin?.options?.symbol,
          type: state.isBuy ? 'buy' : 'sell',
          amount: `${state?.selectedAmount} ${localCurrency}`,
          walletAddress: state?.selectedCryptoCoin?.options?.walletAddress,
        };
        if (previousOTCData?.address2) {
          payload.address2 = previousOTCData?.address2;
        }
        const resp = await addOTC(payload);
        setIsSubmitting(false);
        if (resp?.status === 200) {
          toast.dismiss(toastId);
          toast.success('OTC Request submitted successfully');
          router.push(`/wallet/${clientId}/home`);
        } else {
          toast.dismiss(toastId);
          toast.error('Something went wrong');
        }
      }
    } catch (e) {
      console.error(' Error in add OTC', e);
      setIsSubmitting(false);
      toast.dismiss(toastId);
      toast.error('Something went wrong');
    }
  }, [
    otcData,
    state?.sourceOfFund,
    state?.selectedCryptoCoin?.options?.chain_name,
    state?.selectedCryptoCoin?.options?.symbol,
    state?.selectedCryptoCoin?.options?.walletAddress,
    state.isBuy,
    state?.selectedAmount,
    localCurrency,
    router,
    clientId,
  ]);

  const {isBuy, risk, selectedAmount, selectedCryptoCoin, sourceOfFund, terms} =
    state;
  const isDisabled =
    !risk ||
    !selectedAmount ||
    !selectedCryptoCoin ||
    !sourceOfFund ||
    !terms ||
    isSubmitting;

  return (
    <main className={styles.container}>
      <div className={styles.goBack}>
        <GoBackButton />
      </div>
      <div className={styles.formInput}>
        <p className={styles.title}>{'Choose your options'}</p>
        <div className={styles.buttonBox}>
          <div className={styles.mainOptionsdiv}>
            <button
              onClick={() => {
                setState(prevState => ({
                  ...prevState,
                  isBuy: true,
                }));
              }}
              className={[
                isBuy ? styles.selectedMainOptions : styles.mainSubViewOptions,
              ]}
              style={{
                borderTopRightRadius: '0',
                borderBottomRightRadius: '0',
                borderTopLeftRadius: '4px',
                borderBottomLeftRadius: '4px',
              }}>
              {'Buy Crypto'}
            </button>
            <button
              onClick={() => {
                setState(prevState => ({
                  ...prevState,
                  isBuy: false,
                }));
              }}
              className={[
                !isBuy ? styles.selectedMainOptions : styles.mainSubViewOptions,
              ]}
              style={{
                borderTopRightRadius: '4px',
                borderBottomRightRadius: '4px',
                borderTopLeftRadius: '0',
                borderBottomLeftRadius: '0',
              }}>
              {'Sell Crypto'}
            </button>
          </div>
        </div>

        <p className={styles.textStyle}>{'Select Crypto'}</p>
        <div className={styles.dropdownContainer}>
          <SelectInputExchange
            listData={dropDownList}
            onValueChange={onChangeCryptoCoin}
            selectedValue={state.selectedCryptoCoin?.value}
            placeholder={'Select Crypto'}
          />
        </div>

        <p className={styles.textStyle}>{'Select amount'}</p>
        <div className={styles.dropdownContainer}>
          <SelectInputExchange
            listData={finalAmountOptions}
            onValueChange={onChangeAmount}
            selectedValue={state.selectedAmount}
            placeholder={'Select amount'}
          />
        </div>

        <p className={styles.textStyle}>{'Source of Funds'}</p>
        <div className={styles.itemSection}>
          {sourceOfFundList?.map((item, index) => (
            <div className={styles.itemBox} key={index}>
              <Checkbox
                checked={state.sourceOfFund === item.label}
                onChange={() => {
                  setState(prevState => ({
                    ...prevState,
                    sourceOfFund: item.label,
                  }));
                }}
                inputProps={{'aria-label': 'controlled'}}
                icon={<RadioButtonUncheckedIcon />}
                checkedIcon={<RadioButtonCheckedIcon />}
              />

              <p className={styles.item}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className={styles.textStyle}>
          {'This service is provided by ozaraglobal.com.'}
        </p>
        <CryptoCheckbox
          number={'1'}
          title={'terms and conditions'}
          setTermsCheck={isChecked => {
            setState(prevState => ({
              ...prevState,
              terms: isChecked,
            }));
          }}
        />

        <CryptoCheckbox
          number={'2'}
          title={'Risk disclaimer'}
          setRiskCheck={isChecked => {
            setState(prevState => ({
              ...prevState,
              risk: isChecked,
            }));
          }}
        />
      </div>
      <button
        disabled={isDisabled}
        className={styles.button}
        style={{
          backgroundColor: isDisabled ? 'var(--gray)' : 'var(--background)',
        }}
        onClick={onSubmit}>
        {'Next'}
      </button>
    </main>
  );
};

export default OTC2Screen;
