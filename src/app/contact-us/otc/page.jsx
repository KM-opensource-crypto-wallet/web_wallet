'use client';
import React, {useEffect, useCallback, useRef} from 'react';
import {Formik} from 'formik';
import {validationSchemaOTC} from 'utils/validationSchema';
import styles from './OTCScreen.module.css';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import {useState} from 'react';
import DokCountryPicker from 'components/DokCountryPicker';
import {useRouter} from 'next/navigation';
import GoBackButton from 'components/GoBackButton';
import {useDispatch} from 'react-redux';
import {setOTCData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';

const OTCScreen = () => {
  const emailInputRef = useRef(null);
  const address1InputRef = useRef(null);
  const address2InputRef = useRef(null);
  const cityInputRef = useRef(null);
  const zipcodeInputRef = useRef(null);
  const [countries, setCountries] = useState([]);
  const router = useRouter();
  const dispatch = useDispatch();

  const onSubmit = useCallback(
    values => {
      router.push('/buy-crypto/otc2');
      dispatch(setOTCData(values));
    },
    [dispatch, router],
  );
  ////////////////////////////
  useEffect(() => {
    fetch(
      'https://valid.layercode.workers.dev/list/countries?format=select&flags=true&value=code',
    )
      .then(response => response.json())
      .then(data => {
        setCountries(data.countries);
      });
  }, []);

  return (
    <main className={styles.container}>
      <div className={styles.goBack}>
        <GoBackButton />
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
        }) => (
          <form className={styles.formInput} onSubmit={handleSubmit}>
            <p className={styles.title}>{'Personal information'}</p>
            <FormControl variant='outlined'>
              <InputLabel
                sx={{
                  color:
                    errors.email && touched.email
                      ? 'red'
                      : 'var(--borderActiveColor)',
                }}
                focused={false}>
                Full Name
              </InputLabel>
              <OutlinedInput
                fullWidth
                autoFocus={true}
                id='fullname'
                type={'text'}
                name='fullname'
                onChange={handleChange('fullname')}
                onBlur={handleBlur('fullname')}
                value={values.fullname}
                placeholder='Enter full name'
                label='Full Name'
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor:
                      errors.fullname && touched.fullname
                        ? 'red'
                        : 'var(--sidebarIcon)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor:
                      errors.fullname && touched.fullname
                        ? 'red'
                        : 'var(--borderActiveColor)',
                  },
                  '& .MuiInputLabel-outlined': {
                    color:
                      errors.fullname && touched.fullname
                        ? 'red'
                        : 'var(--sidebarIcon)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--sidebarIcon) !important',
                  },
                }}
              />
            </FormControl>

            {errors.fullname && touched.fullname && (
              <p className={styles.textConfirm}>{errors.fullname}</p>
            )}

            {/* /////////////////////////////email////////////////// */}
            <FormControl variant='outlined' ref={emailInputRef}>
              <InputLabel
                sx={{
                  color:
                    errors.email && touched.email
                      ? 'red'
                      : 'var(--borderActiveColor)',
                }}
                focused={false}>
                Email address
              </InputLabel>
              <OutlinedInput
                fullWidth
                className={styles.input}
                id='email'
                type={'email'}
                name='email'
                onChange={handleChange('email')}
                onBlur={handleBlur('email')}
                value={values.email}
                placeholder='Enter email address'
                label='Email address'
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor:
                      errors.email && touched.email
                        ? 'red'
                        : 'var(--sidebarIcon)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor:
                      errors.email && touched.email
                        ? 'red'
                        : 'var(--borderActiveColor)',
                  },
                  '& .MuiInputLabel-outlined': {
                    color:
                      errors.email && touched.email
                        ? 'red'
                        : 'var(--sidebarIcon)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--sidebarIcon) !important',
                  },
                }}
              />
            </FormControl>
            {errors.email && touched.email && (
              <p className={styles.textConfirm}>{errors.email}</p>
            )}

            <p className={styles.title}>{'Residential address'}</p>
            {/* /////////////////////////////address1///////////////// */}
            <FormControl variant='outlined' ref={address1InputRef}>
              <InputLabel
                sx={{
                  color:
                    errors.address1 && touched.address1
                      ? 'red'
                      : 'var(--borderActiveColor)',
                }}
                focused={false}>
                Address 1
              </InputLabel>
              <OutlinedInput
                fullWidth
                className={styles.input}
                id='address1'
                type={'text'}
                name='address1'
                onChange={handleChange('address1')}
                onBlur={handleBlur('address1')}
                value={values.address1}
                label='Address 1'
                placeholder='Enter Address 1'
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor:
                      errors.address1 && touched.address1
                        ? 'red'
                        : 'var(--sidebarIcon)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor:
                      errors.address1 && touched.address1
                        ? 'red'
                        : 'var(--borderActiveColor)',
                  },
                  '& .MuiInputLabel-outlined': {
                    color:
                      errors.address1 && touched.address1
                        ? 'red'
                        : 'var(--sidebarIcon)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--sidebarIcon) !important',
                  },
                }}
              />
            </FormControl>
            {errors.address1 && touched.address1 && (
              <p className={styles.textConfirm}>{errors.address1}</p>
            )}
            {/* /////////////////////////////address1///////////////// */}
            <FormControl variant='outlined' ref={address2InputRef}>
              <InputLabel
                sx={{
                  color:
                    errors.address2 && touched.address2
                      ? 'red'
                      : 'var(--borderActiveColor)',
                }}
                focused={false}>
                Address 2
              </InputLabel>
              <OutlinedInput
                fullWidth
                className={styles.input}
                id='address2'
                type={'text'}
                name='address2'
                onChange={handleChange('address2')}
                onBlur={handleBlur('address2')}
                value={values.address2}
                label='Address 2'
                placeholder='Enter Address 2'
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor:
                      errors.address2 && touched.address2
                        ? 'red'
                        : 'var(--sidebarIcon)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor:
                      errors.address2 && touched.address2
                        ? 'red'
                        : 'var(--borderActiveColor)',
                  },
                  '& .MuiInputLabel-outlined': {
                    color:
                      errors.address2 && touched.address2
                        ? 'red'
                        : 'var(--sidebarIcon)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--sidebarIcon) !important',
                  },
                }}
              />
            </FormControl>
            {errors.address2 && touched.address2 && (
              <p className={styles.textConfirm}>{errors.address2}</p>
            )}

            {/* /////////////////////////////city///////////////// */}
            <div className={styles.rowSection}>
              <div className={styles.rowBox}>
                <FormControl variant='outlined' ref={cityInputRef}>
                  <InputLabel
                    sx={{
                      color:
                        errors.city && touched.city
                          ? 'red'
                          : 'var(--borderActiveColor)',
                    }}
                    focused={false}>
                    City/State
                  </InputLabel>
                  <OutlinedInput
                    className={styles.input}
                    id='city'
                    type={'text'}
                    name='city'
                    onChange={handleChange('city')}
                    onBlur={handleBlur('city')}
                    value={values.city}
                    label='City/State'
                    placeholder='Enter City/State'
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor:
                          errors.city && touched.city
                            ? 'red'
                            : 'var(--sidebarIcon)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor:
                          errors.city && touched.city
                            ? 'red'
                            : 'var(--borderActiveColor)',
                      },
                      '& .MuiInputLabel-outlined': {
                        color:
                          errors.city && touched.city
                            ? 'red'
                            : 'var(--sidebarIcon)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--sidebarIcon) !important',
                      },
                    }}
                  />
                </FormControl>
                {errors.city && touched.city && (
                  <p className={styles.textConfirm}>{errors.city}</p>
                )}
              </div>
              {/* /////////////////////////////zipcode//////////////// */}
              <div className={styles.rowBox}>
                <FormControl variant='outlined' ref={zipcodeInputRef}>
                  <InputLabel
                    sx={{
                      color:
                        errors.zipcode && touched.zipcode
                          ? 'red'
                          : 'var(--borderActiveColor)',
                    }}
                    focused={false}>
                    Post Code
                  </InputLabel>
                  <OutlinedInput
                    className={styles.input}
                    id='zipcode'
                    type={'number'}
                    name='zipcode'
                    onChange={handleChange('zipcode')}
                    onBlur={handleBlur('zipcode')}
                    value={values.zipcode}
                    label='Post Code'
                    placeholder='Enter post code'
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor:
                          errors.zipcode && touched.zipcode
                            ? 'red'
                            : 'var(--sidebarIcon)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor:
                          errors.zipcode && touched.zipcode
                            ? 'red'
                            : 'var(--borderActiveColor)',
                      },
                      '& .MuiInputLabel-outlined': {
                        color:
                          errors.zipcode && touched.zipcode
                            ? 'red'
                            : 'var(--sidebarIcon)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--sidebarIcon) !important',
                      },
                    }}
                  />
                </FormControl>
                {errors.zipcode && touched.zipcode && (
                  <p className={styles.textConfirm}>{errors.zipcode}</p>
                )}
              </div>
            </div>

            <div
              style={{
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: errors.country ? 'red' : 'var(--sidebarIcon)',
                borderRadius: '4px',
              }}>
              <DokCountryPicker
                listData={countries}
                onValueChange={select => {
                  setFieldValue('country', select.target.value.label);
                }}
                placeholder={'Select Country'}
              />
            </div>
            {errors.country && (
              <p className={styles.textConfirm}>{errors.country}</p>
            )}

            <button className={styles.button} type='submit'>
              Next
            </button>
          </form>
        )}
      </Formik>
    </main>
  );
};

export default OTCScreen;
