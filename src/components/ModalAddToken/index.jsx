import React, {useState, useEffect, useRef, useCallback} from 'react';
import {v4 as UUIDV4} from 'uuid';
import {ModalAddTokenList} from 'dok-wallet-blockchain-networks/helper';
import {addToken} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {TronChain} from 'dok-wallet-blockchain-networks/cryptoChain/chains/TronChain';
import {modalAddTokenValidation} from 'utils/validationSchema';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';
import {useDispatch} from 'react-redux';

import Modal from '@mui/material/Modal';
import s from './ModalAddToken.module.css';
import {Formik} from 'formik';

const icons = require(`assets/images/icons`).default;
import {Box} from '@mui/material';
import SelectInput from 'components/SelectInput';
import {useSelector} from 'react-redux';
import {
  selectCurrentWallet,
  selectWalletChainName,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {isEVMChain} from 'dok-wallet-blockchain-networks/helper';
import {
  getCustomRPCWithData,
  selectAllCustomRpc,
} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSelectors';

const ModalAddToken = ({visible, hideModal, data}) => {
  const [networkInput, setNetworkInput] = useState({});
  const chain_name = useSelector(selectWalletChainName);
  const [possibleChain, setPossibleChain] = useState(ModalAddTokenList);

  const dispatch = useDispatch();
  const chainRef = useRef(TronChain());
  const previousTimerRef = useRef(null);
  const formikRef = useRef(null);
  const currentWallet = useSelector(selectCurrentWallet);
  const allCustomRPC = useSelector(selectAllCustomRpc);
  useEffect(() => {
    if (!visible) {
      setNetworkInput({});
    }
  }, [visible]);

  useEffect(() => {
    if (chain_name) {
      const isEVM = isEVMChain(chain_name);
      if (isEVM) {
        setPossibleChain(ModalAddTokenList.filter(item => item.isEVM));
      } else {
        setPossibleChain(
          ModalAddTokenList.filter(item => item.value === chain_name),
        );
      }
    }
  }, [chain_name]);

  const onFormSubmit = values => {
    if (values.name && values.contract_address && values.symbol) {
      const payload = {
        _id: UUIDV4(),
        chain_name: networkInput.value,
        chain_display_name: networkInput.label,
        chain_symbol: networkInput?.chain_symbol,
        type: networkInput?.type,
        token_type: networkInput?.token_type,
        name: values.name,
        symbol: values.symbol,
        contractAddress: values.contract_address,
        decimal: values.decimal,
        status: true,
        isInWallet: true,
      };
      if (values.icon) {
        payload.icon = values.icon;
      }
      dispatch(addToken(payload));
      hideModal(false);
    }
  };

  const showAddressError = useCallback(async () => {
    await formikRef?.current?.setErrors({
      fields: {
        contract_address: `Invalid ${networkInput?.value?.toUpperCase()} contract contract_address`,
      },
    });
    await formikRef?.current?.setValues({
      name: '',
      decimal: '',
      symbol: '',
    });
  }, [networkInput?.value]);

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '95%',
    bgcolor: 'var(--secondaryBackgroundColor)',
    borderRadius: '10px',
    overflow: 'hidden',
    '@media (min-width: 768px)': {
      width: '50%',
    },
  };

  const onChangeNetwork = useCallback(
    value => {
      const foundChain = ModalAddTokenList.find(item => item.value === value);
      if (foundChain) {
        formikRef?.current?.setValues({
          contract_address: '',
          name: '',
          decimal: '',
          symbol: '',
        });
        setNetworkInput(foundChain);
        const customRPC = getCustomRPCWithData(
          allCustomRPC,
          networkInput?.value,
          currentWallet?.clientId,
        );
        chainRef.current = getChain(
          networkInput?.value,
          currentWallet?.phrase,
          customRPC,
        );
      }
    },
    [
      allCustomRPC,
      currentWallet?.clientId,
      currentWallet?.phrase,
      networkInput?.value,
    ],
  );

  return (
    <Modal
      open={visible}
      onClose={() => hideModal(false)}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'>
      <Box sx={style}>
        <div className={s.centeredView}>
          <div className={s.modalView}>
            <div className={s.modalHeader}>
              <p className={s.headerText}>Add Custom Token</p>
              <button
                onClick={() => {
                  hideModal(false);
                }}
                className={s.closeBtn}>
                {icons.close}
              </button>
            </div>
            <div className={s.modalBody}>
              <Formik
                initialValues={{
                  contract_address: '',
                  name: '',
                  symbol: '',
                  decimal: '',
                  icon: '',
                }}
                innerRef={formikRef}
                validationSchema={modalAddTokenValidation}
                onSubmit={values => onFormSubmit(values)}>
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  values,
                  errors,
                  setFieldValue,
                  setFieldTouched,
                  isValid,
                }) => {
                  return (
                    <div>
                      <div className={s.addressViev}>
                        <SelectInput
                          listData={possibleChain}
                          onValueChange={onChangeNetwork}
                          value={networkInput?.value}
                          placeholder={'Select Network'}
                        />
                      </div>
                      <div className={s.qrContainer}>
                        <input
                          className={s.input}
                          placeholder='Address'
                          name='contract_address'
                          onChange={async event => {
                            const value = event?.target.value;
                            setFieldValue('contract_address', value);
                            const isValidAddress =
                              chainRef.current?.isValidAddress({
                                address: value,
                              });
                            if (isValidAddress) {
                              const resp = await chainRef?.current?.getContract(
                                {
                                  contractAddress: value,
                                },
                              );
                              if (resp?.name) {
                                setFieldValue('name', resp?.name);
                              } else {
                                showAddressError();
                              }
                              if (resp?.decimals) {
                                setFieldValue(
                                  'decimal',
                                  resp?.decimals?.toString(),
                                );
                              }
                              if (resp?.symbol) {
                                setFieldValue('symbol', resp?.symbol);
                              }
                              setFieldTouched('contract_address', true);
                              if (resp?.icon) {
                                setFieldValue('icon', resp?.icon);
                              }
                            } else {
                              if (previousTimerRef.current) {
                                previousTimerRef.current = null;
                                clearTimeout(previousTimerRef.current);
                              }
                              showAddressError();
                              previousTimerRef.current = setTimeout(() => {
                                // showAddressError();
                                previousTimerRef.current = null;
                              }, 500);
                            }
                          }}
                          onBlur={handleBlur('contract_address')}
                          value={values.contract_address}
                        />
                      </div>
                      {errors.contract_address && (
                        <p className={s.errorText}>{errors.contract_address}</p>
                      )}
                      <input
                        className={s.input}
                        // style={{ marginBottom: 20 }}
                        placeholder='Name'
                        readOnly
                        // theme={{
                        //   colors: {
                        //     onSurfaceVariant: "#989898",
                        //   },
                        // }}

                        disabled={!values.contract_address && !values.name}
                        name='name'
                        onChange={handleChange('name')}
                        onBlur={handleBlur('name')}
                        value={values.name}
                      />
                      <div className={s.qrContainer} style={{marginBottom: 20}}>
                        <input
                          className={s.input}
                          style={{width: '45%'}}
                          placeholder='Symbol'
                          readOnly
                          // theme={{
                          //   colors: {
                          //     onSurfaceVariant: "#989898",
                          //     primary: "#989898",
                          //   },
                          // }}
                          disabled={!values.contract_address && !values.symbol}
                          name='symbol'
                          onChange={handleChange('symbol')}
                          onBlur={handleBlur('symbol')}
                          value={values.symbol}
                        />
                        <input
                          className={s.input}
                          style={{width: '45%'}}
                          readOnly
                          placeholder='Decimal'
                          // theme={{
                          //   colors: {
                          //     onSurfaceVariant: "#989898",
                          //   },
                          // }}

                          disabled={!values.contract_address}
                          name='decimal'
                          onChange={handleChange('decimal')}
                          onBlur={handleBlur('decimal')}
                          value={values.decimal}
                        />
                      </div>
                      <button
                        disabled={!isValid}
                        type='button'
                        className={s.button}
                        style={{
                          backgroundColor: !isValid
                            ? 'var(--gray)'
                            : 'var(--background)',
                        }}
                        onClick={handleSubmit}>
                        <p className={s.buttonTitle}>Add new Coin</p>
                      </button>
                    </div>
                  );
                }}
              </Formik>
            </div>
          </div>
        </div>
      </Box>
    </Modal>
  );
};

export default ModalAddToken;
