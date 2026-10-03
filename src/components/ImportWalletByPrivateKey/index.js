import React, {useCallback, useRef, useState} from 'react';
import {Formik} from 'formik';
import * as Yup from 'yup';
import s from './ImportWalletByPrivateKey.module.css';
import {TextField} from '@mui/material';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {
  setChainName,
  setPhrase,
  setPrivateKey,
} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {useDispatch} from 'react-redux';
import GoBackButton from '../GoBackButton';
import SelectInput from '../SelectInput';
import {PrivateKeyList} from 'dok-wallet-blockchain-networks/helper';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';

const ImportWalletByPrivateKey = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const path = usePathname();
  const [networkInput, setNetworkInput] = useState(null);
  const formikRef = useRef();
  const searchParams = useSearchParams();

  const onSubmit = useCallback(
    async values => {
      try {
        const chainName = networkInput;
        const privateKey = values?.privateKey;
        if (chainName && privateKey) {
          const chain = getChain(chainName);
          // Several chains validate asynchronously; an un-awaited Promise is
          // always truthy and would let any key through.
          const isValid = await chain.isValidPrivateKey({privateKey});
          if (isValid) {
            dispatch(setPhrase(null));
            dispatch(setChainName(chainName));
            dispatch(setPrivateKey(privateKey));
            const pathname = `/${path.split('/')[1]}`;
            const searchParamsStr = `${searchParams ? `?${searchParams}` : ''}`;

            if (pathname === '/auth') {
              router.push(`/auth/create-wallet${searchParamsStr}`);
            } else {
              router.push(`/wallets/create-wallet${searchParamsStr}`);
            }
          } else {
            formikRef.current?.setFieldError(
              'privateKey',
              'Invalid privateKey',
            );
          }
        }
      } catch (err) {
        if (err.stack) {
          console.error(`in importWallet: ${JSON.stringify(err)}`);
          formikRef.current?.setErrors({privateKey: 'Invalid privateKey'});
        }
      }
    },
    [dispatch, networkInput, path, router, searchParams],
  );

  return (
    <div className={s.container}>
      <div>
        <GoBackButton />
      </div>
      <div className={s.formInput}>
        <p className={s.title}>Import</p>
        <p className={s.title}>your Wallet</p>
        <p className={s.listTitle}>
          {
            ' Select a chain and enter your private key below to restore your crypto wallet.'
          }
        </p>
        <Formik
          initialValues={{privateKey: ''}}
          innerRef={formikRef}
          validationSchema={Yup.object().shape({
            privateKey: Yup.string().required('Private key is required'),
          })}
          onSubmit={onSubmit}>
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
          }) => (
            <div>
              <div className={s.addressViev}>
                <SelectInput
                  listData={PrivateKeyList}
                  onValueChange={setNetworkInput}
                  value={networkInput}
                  placeholder={'Select Network'}
                />
              </div>
              <TextField
                className={s.input}
                multiline
                rows={7}
                maxRows={12}
                autoComplete={'off'}
                spellCheck={false}
                label='Enter Private Key'
                variant='outlined'
                maxLength={150}
                sx={{
                  // color: errors.privateKey ? "red" : "var(--gray)",
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: errors.privateKey ? 'red' : 'var(--gray)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: errors.privateKey
                      ? 'red'
                      : 'var(--borderActiveColor)',
                  },
                  '& .MuiInputLabel-outlined': {
                    color: errors.privateKey ? 'red' : 'var(--gray)',
                  },
                }}
                name='privateKey'
                autoFocus={true}
                onChange={handleChange('privateKey')}
                onBlur={handleBlur('privateKey')}
                value={values.privateKey}
                onSubmit={handleSubmit}
              />
              {errors.privateKey && touched.privateKey && (
                <p className={s.textConfirm}>{errors.privateKey}</p>
              )}

              <button
                className={s.button}
                onClick={handleSubmit}
                style={
                  !networkInput || !values.privateKey
                    ? {backgroundColor: 'var(--gray)'}
                    : {}
                }
                disabled={!networkInput || !values.privateKey}>
                <p className={s.buttonTitle}>Import</p>
              </button>
            </div>
          )}
        </Formik>
        <p className={s.info}>
          Your Private Key will be encrypted and stored on this device.
        </p>
      </div>
    </div>
  );
};

export default ImportWalletByPrivateKey;
