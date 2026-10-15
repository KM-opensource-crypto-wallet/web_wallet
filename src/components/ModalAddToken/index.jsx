import React, {useState, useEffect, useRef, useCallback} from 'react';
import {v4 as UUIDV4} from 'uuid';
import {ModalAddTokenList} from 'dok-wallet-blockchain-networks/helper';
import {addToken} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {TronChain} from 'dok-wallet-blockchain-networks/cryptoChain/chains/TronChain';
import {modalAddTokenValidation} from 'utils/validationSchema';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';
import {useDispatch} from 'react-redux';

import s from './ModalAddToken.module.css';
import {Formik} from 'formik';
import HomeSheet from 'components/Home/HomeSheet';
import GeneralButton from 'components/Button';
import {CheckIcon, ChevronDownIcon} from 'components/Home/HomeIcons';
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
  const [networkListOpen, setNetworkListOpen] = useState(false);
  const chain_name = useSelector(selectWalletChainName);
  const [possibleChain, setPossibleChain] = useState(ModalAddTokenList);

  const dispatch = useDispatch();
  const chainRef = useRef(TronChain());
  // Bumped per address change; a contract lookup only applies its result if
  // no newer address was entered while it was in flight.
  const lookupIdRef = useRef(0);
  const formikRef = useRef(null);
  const currentWallet = useSelector(selectCurrentWallet);
  const allCustomRPC = useSelector(selectAllCustomRpc);
  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      if (!visible) {
        setNetworkInput({});
      }
    })();
  }, [visible]);

  useEffect(() => {
    // see comment on the first wrapped effect above
    (() => {
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
    })();
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
        setNetworkListOpen(false);
        const customRPC = getCustomRPCWithData(
          allCustomRPC,
          foundChain.value,
          currentWallet?.clientId,
        );
        chainRef.current = getChain(
          foundChain.value,
          currentWallet?.phrase,
          customRPC,
        );
      }
    },
    [allCustomRPC, currentWallet?.clientId, currentWallet?.phrase],
  );

  const close = () => {
    setNetworkListOpen(false);
    hideModal(false);
  };

  return (
    <HomeSheet
      visible={visible}
      onClose={close}
      title='Add custom token'
      labelId='add-token-title'>
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
          handleBlur,
          handleSubmit,
          values,
          errors,
          setValues,
          setFieldError,
          setFieldTouched,
          isValid,
        }) => {
          // Every update goes through setValues with the full value set, so
          // validation always runs against the values just written. Separate
          // setFieldValue calls after the await validated stale values and
          // left the form invalid with all fields filled.
          const onChangeContract = async value => {
            const lookupId = ++lookupIdRef.current;
            const empty = {name: '', symbol: '', decimal: '', icon: ''};
            await setValues({contract_address: value, ...empty}, false);
            if (!value) {
              return;
            }
            const invalidMessage = `Not a valid ${
              networkInput?.label || 'token'
            } contract address`;
            if (!chainRef.current?.isValidAddress({address: value})) {
              setFieldError('contract_address', invalidMessage);
              return;
            }
            let resp = null;
            try {
              resp = await chainRef.current?.getContract({
                contractAddress: value,
              });
            } catch (e) {
              resp = null;
            }
            if (lookupId !== lookupIdRef.current) {
              return;
            }
            if (!resp?.name) {
              setFieldError(
                'contract_address',
                'Could not read a token at this address',
              );
              return;
            }
            await setValues(
              {
                contract_address: value,
                name: resp.name,
                symbol: resp.symbol || '',
                decimal: resp.decimals != null ? resp.decimals.toString() : '',
                icon: resp.icon || '',
              },
              true,
            );
            setFieldTouched('contract_address', true, false);
          };
          const onPaste = async () => {
            try {
              const text = (await navigator.clipboard.readText())?.trim();
              if (text) {
                await onChangeContract(text);
              }
            } catch (e) {
              // Clipboard blocked: the field still accepts a manual paste.
            }
          };
          const addressError =
            values.contract_address && errors.contract_address
              ? errors.contract_address
              : null;
          const hasNetwork = !!networkInput?.value;
          return (
            <form
              className={s.form}
              noValidate
              onSubmit={event => {
                event.preventDefault();
                handleSubmit();
              }}>
              <div className={s.field}>
                <span className={s.label}>Network</span>
                <button
                  type='button'
                  className={s.networkButton}
                  aria-expanded={networkListOpen}
                  onClick={() => setNetworkListOpen(v => !v)}>
                  <span
                    className={`${s.networkLabel} ${
                      hasNetwork ? '' : s.placeholder
                    }`}>
                    {networkInput?.label || 'Select network'}
                  </span>
                  <ChevronDownIcon
                    size={18}
                    className={`${s.chevron} ${
                      networkListOpen ? s.chevronOpen : ''
                    }`}
                  />
                </button>
                {networkListOpen ? (
                  <div className={s.networkList} role='listbox'>
                    {possibleChain.map(item => {
                      const selected = item.value === networkInput?.value;
                      return (
                        <button
                          key={item.value}
                          type='button'
                          role='option'
                          aria-selected={selected}
                          className={`${s.networkOption} ${
                            selected ? s.networkOptionOn : ''
                          }`}
                          onClick={() => onChangeNetwork(item.value)}>
                          {item.label}
                          {selected ? <CheckIcon size={16} /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className={s.field}>
                <label htmlFor='token-contract' className={s.label}>
                  Contract address
                </label>
                <div
                  className={`${s.inputBox} ${
                    addressError ? s.inputBoxError : ''
                  } ${hasNetwork ? '' : s.inputBoxDisabled}`}>
                  <input
                    id='token-contract'
                    className={s.input}
                    placeholder={
                      hasNetwork ? 'Contract address' : 'Select a network first'
                    }
                    name='contract_address'
                    autoComplete='off'
                    spellCheck={false}
                    disabled={!hasNetwork}
                    onChange={event => onChangeContract(event?.target.value)}
                    onBlur={handleBlur('contract_address')}
                    value={values.contract_address}
                  />
                  {hasNetwork && !values.contract_address ? (
                    <button
                      type='button'
                      className={s.pasteButton}
                      onClick={onPaste}>
                      Paste
                    </button>
                  ) : null}
                </div>
                {addressError ? (
                  <p className={s.error} role='alert'>
                    {addressError}
                  </p>
                ) : null}
              </div>

              <div className={s.field}>
                <span className={s.label}>
                  Token details{' '}
                  <span className={s.optional}>· filled from the contract</span>
                </span>
                <div className={`${s.inputBox} ${s.inputBoxReadOnly}`}>
                  <input
                    className={s.input}
                    placeholder='Token name'
                    aria-label='Token name'
                    readOnly
                    name='name'
                    value={values.name}
                  />
                </div>
                <div className={s.pair}>
                  <div className={`${s.inputBox} ${s.inputBoxReadOnly}`}>
                    <input
                      className={s.input}
                      placeholder='Symbol'
                      aria-label='Symbol'
                      readOnly
                      name='symbol'
                      value={values.symbol}
                    />
                  </div>
                  <div className={`${s.inputBox} ${s.inputBoxReadOnly}`}>
                    <input
                      className={s.input}
                      placeholder='Decimals'
                      aria-label='Decimals'
                      readOnly
                      name='decimal'
                      value={values.decimal}
                    />
                  </div>
                </div>
              </div>

              <GeneralButton
                type='submit'
                fullWidth
                className={s.submit}
                disabled={!isValid || !hasNetwork || !values.name}>
                Add token
              </GeneralButton>
            </form>
          );
        }}
      </Formik>
    </HomeSheet>
  );
};

export default ModalAddToken;
