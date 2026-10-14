'use client';
import {walletRoutes} from 'utils/routes';
import React, {useEffect, useCallback, useMemo, useState} from 'react';
import {Formik} from 'formik';
import {validationSchemaOTC} from 'utils/validationSchema';
import styles from './OTCScreen.module.css';
import {useRouter} from 'next/navigation';
import {useDispatch} from 'react-redux';
import {setOTCData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import GeneralButton from 'components/Button';
import HomeSheet from 'components/Home/HomeSheet';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import hs from 'components/Home/Home.module.css';
import useWallet from 'src/hooks/wallet/useWallet';

// Labelled text input with its validation message.
const Field = ({id, label, error, className, ...inputProps}) => (
  <div className={`${styles.field} ${className || ''}`}>
    <label className={styles.fieldLabel} htmlFor={id}>
      {label}
    </label>
    <div className={`${styles.inputRow} ${error ? styles.inputError : ''}`}>
      <input
        id={id}
        name={id}
        className={styles.input}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
    </div>
    {error ? (
      <p id={`${id}-error`} className={styles.error}>
        {error}
      </p>
    ) : null}
  </div>
);

const OTCScreen = () => {
  const [countries, setCountries] = useState([]);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const router = useRouter();
  const dispatch = useDispatch();
  const {currentWalletClientId} = useWallet();

  const onSubmit = useCallback(
    values => {
      router.push(walletRoutes.buyCryptoOtc2(currentWalletClientId));
      dispatch(setOTCData(values));
    },
    [dispatch, router, currentWalletClientId],
  );

  useEffect(() => {
    fetch(
      'https://valid.layercode.workers.dev/list/countries?format=select&flags=true&value=code',
    )
      .then(response => response.json())
      .then(data => {
        setCountries(data.countries);
      });
  }, []);

  const countryResults = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    const list = countries || [];
    return q
      ? list.filter(
          c =>
            c?.label?.toLowerCase().includes(q) ||
            c?.value?.toLowerCase() === q,
        )
      : list;
  }, [countries, countryQuery]);

  const closeCountryPicker = () => {
    setCountryQuery('');
    setCountryPickerOpen(false);
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
        <h1 className={styles.title}>OTC</h1>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>

      <Formik
        initialValues={{
          fullname: '',
          email: '',
          address1: '',
          address2: '',
          city: '',
          zipcode: '',
          country: '',
        }}
        validationSchema={validationSchemaOTC}
        onSubmit={onSubmit}>
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
          setFieldValue,
          setFieldTouched,
        }) => {
          const fieldError = name =>
            errors[name] && touched[name] ? errors[name] : null;
          return (
            <>
              <form
                className={styles.column}
                noValidate
                onSubmit={handleSubmit}>
                <p className={styles.lead}>
                  Tell us who you are and where you live. We use these details
                  to set up your over-the-counter order.
                </p>

                <section
                  className={styles.section}
                  aria-labelledby='otc-personal'>
                  <h2 className={styles.sectionLabel} id='otc-personal'>
                    Personal information
                  </h2>
                  <div className={styles.card}>
                    <Field
                      id='fullname'
                      label='Full name'
                      type='text'
                      autoComplete='name'
                      autoFocus={true}
                      placeholder='Enter full name'
                      onChange={handleChange('fullname')}
                      onBlur={handleBlur('fullname')}
                      value={values.fullname}
                      error={fieldError('fullname')}
                    />
                    <Field
                      id='email'
                      label='Email address'
                      type='email'
                      autoComplete='email'
                      placeholder='Enter email address'
                      onChange={handleChange('email')}
                      onBlur={handleBlur('email')}
                      value={values.email}
                      error={fieldError('email')}
                    />
                  </div>
                </section>

                <section
                  className={styles.section}
                  aria-labelledby='otc-address'>
                  <h2 className={styles.sectionLabel} id='otc-address'>
                    Residential address
                  </h2>
                  <div className={styles.card}>
                    <Field
                      id='address1'
                      label='Address 1'
                      type='text'
                      autoComplete='address-line1'
                      placeholder='Enter Address 1'
                      onChange={handleChange('address1')}
                      onBlur={handleBlur('address1')}
                      value={values.address1}
                      error={fieldError('address1')}
                    />
                    <Field
                      id='address2'
                      label='Address 2 (optional)'
                      type='text'
                      autoComplete='address-line2'
                      placeholder='Enter Address 2'
                      onChange={handleChange('address2')}
                      onBlur={handleBlur('address2')}
                      value={values.address2}
                      error={fieldError('address2')}
                    />
                    <div className={styles.pair}>
                      <Field
                        id='city'
                        label='City/State'
                        type='text'
                        autoComplete='address-level2'
                        placeholder='Enter City/State'
                        onChange={handleChange('city')}
                        onBlur={handleBlur('city')}
                        value={values.city}
                        error={fieldError('city')}
                      />
                      <Field
                        id='zipcode'
                        label='Post code'
                        type='text'
                        autoComplete='postal-code'
                        placeholder='Enter post code'
                        onChange={handleChange('zipcode')}
                        onBlur={handleBlur('zipcode')}
                        value={values.zipcode}
                        error={fieldError('zipcode')}
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel} id='country-label'>
                        Country
                      </span>
                      <button
                        type='button'
                        className={`${styles.select} ${
                          errors.country ? styles.inputError : ''
                        }`}
                        aria-haspopup='dialog'
                        aria-labelledby='country-label'
                        onClick={() => setCountryPickerOpen(true)}>
                        {values.country ? (
                          <span className={styles.selectValue}>
                            {values.country}
                          </span>
                        ) : (
                          <span className={styles.selectPlaceholder}>
                            Select Country
                          </span>
                        )}
                        <ChevronDownIcon size={18} className={styles.chevron} />
                      </button>
                      {errors.country ? (
                        <p className={styles.error}>{errors.country}</p>
                      ) : null}
                    </div>
                  </div>
                </section>

                <GeneralButton type='submit' fullWidth>
                  Next
                </GeneralButton>
              </form>

              <HomeSheet
                visible={countryPickerOpen}
                onClose={() => {
                  closeCountryPicker();
                  setFieldTouched('country', true);
                }}
                title='Select country'
                labelId='country-picker-title'>
                <label className={hs.sheetSearch}>
                  <SearchIcon size={17} />
                  <input
                    autoFocus={true}
                    value={countryQuery}
                    onChange={e => setCountryQuery(e.target.value)}
                    placeholder='Search countries'
                    aria-label='Search countries'
                  />
                </label>
                <div
                  className={hs.pickerList}
                  role='listbox'
                  aria-label='Countries'>
                  {countryResults.map(country => {
                    const active = country.label === values.country;
                    return (
                      <button
                        key={country.value}
                        type='button'
                        role='option'
                        aria-selected={active}
                        className={`${styles.option} ${
                          active ? styles.optionActive : ''
                        }`}
                        onClick={() => {
                          setFieldValue('country', country.label);
                          closeCountryPicker();
                        }}>
                        <span className={styles.optionName}>
                          {country.label}
                        </span>
                        {active ? (
                          <CheckIcon size={18} className={styles.optionCheck} />
                        ) : null}
                      </button>
                    );
                  })}
                  {countryResults.length === 0 ? (
                    <p className={hs.sheetEmpty}>
                      {countries?.length
                        ? 'No countries found'
                        : 'Loading countries…'}
                    </p>
                  ) : null}
                </div>
              </HomeSheet>
            </>
          );
        }}
      </Formik>
    </main>
  );
};

export default OTCScreen;
