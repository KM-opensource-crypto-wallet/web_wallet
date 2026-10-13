'use client';
import {walletRoutes} from 'utils/routes';
import styles from './OTC2Screen.module.css';
import React, {useContext, useState, useCallback, useMemo} from 'react';
import {useParams, useRouter} from 'next/navigation';

import {shallowEqual, useSelector} from 'react-redux';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {addOTC} from 'dok-wallet-blockchain-networks/service/dokApi';
import {getUserCoinsOptions} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {ThemeContext} from 'theme/ThemeContext';
import {getOTCData} from 'dok-wallet-blockchain-networks/redux/extraData/extraSelectors';
import {currencySymbol} from 'data/currency';
import {toast} from 'react-toastify';
import {getAppIcon, getAppIconDark} from 'whitelabel/whiteLabelInfo';
import CoinIcon from 'components/CoinIcon';
import GeneralButton from 'components/Button';
import HomeSheet from 'components/Home/HomeSheet';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import {ExternalLinkIcon} from 'components/Transactions/TxIcons';
import hs from 'components/Home/Home.module.css';

// Provider documents the two consents link to.
const CONSENTS = [
  {
    key: 'terms',
    label: 'terms and conditions',
    url: 'https://ozaraglobal.com/terms.php',
  },
  {
    key: 'risk',
    label: 'Risk disclaimer',
    url: 'https://ozaraglobal.com/policy.php',
  },
];

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
  const [coinPickerOpen, setCoinPickerOpen] = useState(false);
  const [coinQuery, setCoinQuery] = useState('');
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

  const [dropDownList, setDropDownList] = useState(
    Array.isArray(coinOptions)
      ? [...coinOptions, otherOptions]
      : [otherOptions],
  );

  const onChangeCryptoCoin = useCallback(
    value => {
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

  const onChangeAmount = useCallback(value => {
    setState(prevState => ({
      ...prevState,
      selectedAmount: value,
    }));
  }, []);

  const {isBuy, risk, selectedAmount, selectedCryptoCoin, sourceOfFund, terms} =
    state;
  const selectedChainName = selectedCryptoCoin?.options?.chain_name;
  const selectedSymbol = selectedCryptoCoin?.options?.symbol;
  const selectedWalletAddress = selectedCryptoCoin?.options?.walletAddress;

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
          fundSource: sourceOfFund?.toLowerCase(),
          chain: selectedChainName,
          asset: selectedSymbol,
          type: isBuy ? 'buy' : 'sell',
          amount: `${selectedAmount} ${localCurrency}`,
          walletAddress: selectedWalletAddress,
        };
        if (previousOTCData?.address2) {
          payload.address2 = previousOTCData?.address2;
        }
        const resp = await addOTC(payload);
        setIsSubmitting(false);
        if (resp?.status === 200) {
          toast.dismiss(toastId);
          toast.success('OTC Request submitted successfully');
          router.push(walletRoutes.home(clientId));
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
    sourceOfFund,
    selectedChainName,
    selectedSymbol,
    selectedWalletAddress,
    isBuy,
    selectedAmount,
    localCurrency,
    router,
    clientId,
  ]);

  const isDisabled =
    !risk ||
    !selectedAmount ||
    !selectedCryptoCoin?.value ||
    !sourceOfFund ||
    !terms ||
    isSubmitting;

  const fiatSymbol = currencySymbol[localCurrency] || '';
  const selectedCoin = selectedCryptoCoin?.options;
  const coinResults = useMemo(() => {
    const q = coinQuery.trim().toLowerCase();
    return q
      ? dropDownList.filter(
          item =>
            item?.options?.title?.toLowerCase().includes(q) ||
            item?.options?.symbol?.toLowerCase().includes(q),
        )
      : dropDownList;
  }, [coinQuery, dropDownList]);

  const closeCoinPicker = () => {
    setCoinQuery('');
    setCoinPickerOpen(false);
  };

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden='true' />
      <div className={styles.topBar}>
        <GeneralButton
          variant='unstyled'
          className={styles.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <h1 className={styles.title}>OTC order</h1>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>

      <div className={styles.column}>
        <div
          className={styles.segmented}
          role='radiogroup'
          aria-label='Order type'>
          {[
            {label: 'Buy Crypto', buy: true},
            {label: 'Sell Crypto', buy: false},
          ].map(option => (
            <button
              key={option.label}
              type='button'
              role='radio'
              aria-checked={isBuy === option.buy}
              className={`${styles.segment} ${
                isBuy === option.buy ? styles.segmentActive : ''
              }`}
              onClick={() =>
                setState(prevState => ({...prevState, isBuy: option.buy}))
              }>
              {option.label}
            </button>
          ))}
        </div>

        <section className={styles.card} aria-label='Order details'>
          <div className={styles.field}>
            <span className={styles.fieldLabel} id='otc-coin-label'>
              Crypto
            </span>
            <button
              type='button'
              className={styles.coinButton}
              aria-haspopup='dialog'
              aria-labelledby='otc-coin-label'
              onClick={() => setCoinPickerOpen(true)}>
              {selectedCoin ? (
                <>
                  <span className={styles.coinIcon}>
                    <CoinIcon item={selectedCoin} />
                  </span>
                  <span className={styles.coinText}>
                    <span className={styles.coinSymbol}>
                      {selectedCoin.symbol || selectedCoin.title}
                      {selectedCoin.chain_display_name ? (
                        <span className={styles.network}>
                          {selectedCoin.chain_display_name}
                        </span>
                      ) : null}
                    </span>
                    {selectedCoin.symbol ? (
                      <span className={styles.coinName}>
                        {selectedCoin.title}
                      </span>
                    ) : null}
                  </span>
                </>
              ) : (
                <span className={styles.placeholder}>Select Crypto</span>
              )}
              <ChevronDownIcon size={18} className={styles.chevron} />
            </button>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel} id='otc-amount-label'>
              Amount ({localCurrency})
            </span>
            <div
              className={styles.chips}
              role='radiogroup'
              aria-labelledby='otc-amount-label'>
              {amountOptions.map(item => (
                <button
                  key={item.value}
                  type='button'
                  role='radio'
                  aria-checked={selectedAmount === item.value}
                  className={`${styles.chip} ${
                    selectedAmount === item.value ? styles.chipActive : ''
                  }`}
                  onClick={() => onChangeAmount(item.value)}>
                  {fiatSymbol}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel} id='otc-source-label'>
              Source of funds
            </span>
            <div
              className={styles.chips}
              role='radiogroup'
              aria-labelledby='otc-source-label'>
              {sourceOfFundList.map(item => (
                <button
                  key={item.label}
                  type='button'
                  role='radio'
                  aria-checked={sourceOfFund === item.label}
                  className={`${styles.chip} ${
                    sourceOfFund === item.label ? styles.chipActive : ''
                  }`}
                  onClick={() =>
                    setState(prevState => ({
                      ...prevState,
                      sourceOfFund: item.label,
                    }))
                  }>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby='otc-consent'>
          <h2 className={styles.sectionLabel} id='otc-consent'>
            Agreements
          </h2>
          <p className={styles.provider}>
            This service is provided by ozaraglobal.com.
          </p>
          <div className={styles.consentCard}>
            {CONSENTS.map(consent => {
              const checked = state[consent.key];
              return (
                <div key={consent.key} className={styles.consent}>
                  <button
                    type='button'
                    role='checkbox'
                    aria-checked={checked}
                    aria-label={`I accept the ${consent.label}`}
                    className={`${styles.tick} ${checked ? styles.tickOn : ''}`}
                    onClick={() =>
                      setState(prevState => ({
                        ...prevState,
                        [consent.key]: !prevState[consent.key],
                      }))
                    }>
                    {checked ? <CheckIcon size={13} strokeWidth={3} /> : null}
                  </button>
                  <span className={styles.consentText}>
                    I accept the{' '}
                    <a
                      href={consent.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={styles.consentLink}>
                      {consent.label}
                      <ExternalLinkIcon size={12} />
                    </a>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <GeneralButton
          fullWidth
          disabled={isDisabled}
          loading={isSubmitting}
          loadingLabel='Submitting…'
          onClick={onSubmit}>
          Next
        </GeneralButton>
      </div>

      <HomeSheet
        visible={coinPickerOpen}
        onClose={closeCoinPicker}
        title={isBuy ? 'Buy which coin?' : 'Sell which coin?'}
        labelId='otc-coin-picker-title'>
        <label className={hs.sheetSearch}>
          <SearchIcon size={17} />
          <input
            autoFocus={true}
            value={coinQuery}
            onChange={e => setCoinQuery(e.target.value)}
            placeholder='Search coins'
            aria-label='Search coins'
          />
        </label>
        <div className={hs.pickerList} role='listbox' aria-label='Coins'>
          {coinResults.map(item => {
            const active = item.value === selectedCryptoCoin?.value;
            return (
              <button
                key={item.value}
                type='button'
                role='option'
                aria-selected={active}
                className={`${styles.option} ${
                  active ? styles.optionActive : ''
                }`}
                onClick={() => {
                  onChangeCryptoCoin(item.value);
                  closeCoinPicker();
                }}>
                <span className={styles.coinIcon}>
                  <CoinIcon item={item.options} />
                </span>
                <span className={styles.coinText}>
                  <span className={styles.optionTitle}>
                    {item.options?.symbol || item.options?.title}
                    {item.options?.chain_display_name ? (
                      <span className={styles.optionNetwork}>
                        {item.options.chain_display_name}
                      </span>
                    ) : null}
                  </span>
                  {item.options?.symbol ? (
                    <span className={styles.optionHint}>
                      {item.options?.title}
                    </span>
                  ) : null}
                </span>
                {active ? (
                  <CheckIcon size={18} className={styles.optionCheck} />
                ) : null}
              </button>
            );
          })}
          {coinResults.length === 0 ? (
            <p className={hs.sheetEmpty}>No coins found</p>
          ) : null}
        </div>
      </HomeSheet>
    </main>
  );
};

export default OTC2Screen;
