import React, {useCallback, useEffect, useRef, useState} from 'react';
import {shallowEqual, useSelector, useDispatch} from 'react-redux';
import SelectInputExchange from 'components/SelectInputExchange';
import DokDropdown from 'components/DokDropdown';
import {
  getCoinsOptions,
  selectCurrentWalletClientId,
  selectVisibleWallets,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getExchange} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSelectors';
import {
  calculateExchange,
  setExchangeFields,
} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';
import BigNumber from 'bignumber.js';
import {
  calculateSliderValue,
  debounce,
  multiplyBNWithFixed,
  validateNumber,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import {useRouter} from 'next/navigation';
import {TextField} from '@mui/material';
import s from './Exchange.module.css';

const icons = require(`assets/images/icons`).default;
import Loading from '../Loading';
import ModalAddCoins from '../ModalAddCoins';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {currencySymbol} from 'data/currency';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {setCurrentTransferSuccess} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {getExchangeQuote} from 'dok-wallet-blockchain-networks/service/dokApi';
import ExchangeProviderItem from 'components/ExchangeProviderItem';
import DokSlider from 'components/DokSlider';
import {getExchangeProviders} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProvidersSelectors';

const calculateEstimatePrice = async (
  selectedFromAsset,
  selectedToAsset,
  data,
  dispatch,
  callback,
) => {
  const fromSymbol = selectedFromAsset?.symbol;
  const fromNetwork = selectedFromAsset?.chain_symbol;
  const toSymbol = selectedToAsset?.symbol;
  const toNetwork = selectedToAsset?.chain_symbol;

  const payload = {
    coinFrom: fromSymbol,
    coinTo: toSymbol,
    networkFrom: fromNetwork,
    networkTo: toNetwork,
    amount: validateNumber(data)?.toString() || '1',
    rateType: 'fixed',
    fromChainName: selectedFromAsset?.chain_name,
    toChainName: selectedToAsset?.chain_name,
    fromContractAddress: selectedFromAsset?.contractAddress,
    toContractAddress: selectedToAsset?.contractAddress,
  };

  const resp = await getExchangeQuote(payload);
  const respData = resp?.data;
  let max = new BigNumber(1);
  let maxIndex = 0;
  for (let i = 0; i <= respData.length; i++) {
    const currentResponse = respData?.[i];
    const toAmount = currentResponse?.toAmount;
    if (toAmount) {
      if (new BigNumber(toAmount).gt(max)) {
        max = new BigNumber(toAmount);
        maxIndex = i;
      }
    }
  }
  const finalResp = respData[maxIndex];
  if (finalResp?.toAmount) {
    const payloadd = {
      amountTo: finalResp?.toAmount + '',
      selectedExchangeChain: finalResp,
      extraData: finalResp?.extraData,
      availableProviders: respData,
    };
    dispatch(setExchangeFields(payloadd));
  } else {
    dispatch(
      setExchangeFields({
        amountTo: '0',
        availableProviders: [],
      }),
    );
  }
  callback?.();
};

const Exchange = ({}) => {
  const exchangeProviderText = useSelector(getExchangeProviders);
  const coinOptions = useSelector(getCoinsOptions, shallowEqual);
  const allWallets = useSelector(selectVisibleWallets);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const {
    selectedCoinToOptions,
    selectedFromAsset,
    selectedCoinFromOptions,
    possibleFromCoin,
    selectedToAsset,
    possibleToCoins,
    amountFrom,
    amountTo,
    customOption,
    customAddress,
    fiatPay,
    availableProviders,
    selectedExchangeChain,
    sliderValue,
  } = useSelector(getExchange);
  const router = useRouter();
  const localCurrency = useSelector(getLocalCurrency);

  const [modalAddCoinsVisible, setModalAddCoinsVisible] = useState(false);

  const [isFetching, setIsFetching] = useState({from: false, to: false});

  const minimumAmountRef = useRef({});

  const dispatch = useDispatch();

  // useEffect(() => {
  //   if (selectedCoinToOptions) {
  //     onChangeToValues({event: {target: {value: selectedCoinToOptions.value}}});
  //   }
  //   if (selectedCoinFromOptions) {
  //     onChangeFromValues({
  //       event: {target: {value: selectedCoinFromOptions.value}},
  //     });
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceEstimateAmount = useCallback(
    debounce(
      (
        localSelectedFromAsset,
        localSelectedToAsset,
        localData,
        localDispatch,
        callback,
      ) =>
        calculateEstimatePrice(
          localSelectedFromAsset,
          localSelectedToAsset,
          localData,
          localDispatch,
          callback,
        ),
      1000,
    ),
    [],
  );

  const handleFromChange = useCallback(
    async (e, isNotUpdateSlider) => {
      if (selectedToAsset) {
        setIsFetching({from: false, to: true});
      }
      const tempValues = validateNumberInInput(
        e.target.value,
        selectedFromAsset?.decimal,
      );
      const tempFiatPay = multiplyBNWithFixed(
        tempValues,
        selectedFromAsset?.currencyRate,
        2,
      );
      if (!isNotUpdateSlider) {
        const balance = selectedFromAsset?.totalAmount;
        if (balance) {
          const tempSliderValue = calculateSliderValue(balance, tempValues);
          dispatch(
            setExchangeFields({
              amountFrom: tempValues,
              fiatPay: tempFiatPay,
              sliderValue: Number(tempSliderValue),
            }),
          );
        }
      } else {
        dispatch(
          setExchangeFields({amountFrom: tempValues, fiatPay: tempFiatPay}),
        );
      }
      if (selectedFromAsset?.symbol && selectedToAsset?.symbol) {
        await debounceEstimateAmount(
          selectedFromAsset,
          selectedToAsset,
          tempValues,
          dispatch,
          () => {
            setIsFetching({from: false, to: false});
          },
        );
      }
    },
    [debounceEstimateAmount, dispatch, selectedFromAsset, selectedToAsset],
  );

  const handleSubmit = useCallback(async () => {
    dispatch(setCurrentTransferSuccess(false));
    dispatch(
      setRouteStateData({
        transfer: {
          fromScreen: 'Exchange',
        },
      }),
    );
    router.push('/swap/confirm');
    dispatch(calculateExchange());
  }, [dispatch, router]);

  const getCoinDetails = useCallback(
    coinDetails => {
      let selectedCoinDetails = {};
      let selectedWalletDetails = {};
      let possibleCoinDetails = [];
      for (let i = 0; i < allWallets.length; i++) {
        const tempWallet = allWallets[i];
        let tempCoinDetails = tempWallet?.coins.find(
          item =>
            item?.symbol?.toUpperCase() ===
              coinDetails?.options?.symbol?.toUpperCase() &&
            item?.chain_name === coinDetails?.options?.chain_name,
        );
        if (tempCoinDetails?.chain_symbol === 'BNB') {
          tempCoinDetails = {...tempCoinDetails};
          tempCoinDetails.chain_symbol = 'BSC';
        }
        if (tempWallet?.clientId === currentWalletClientId && tempCoinDetails) {
          selectedCoinDetails = tempCoinDetails;
          selectedWalletDetails = tempWallet;
        }
        if (tempCoinDetails) {
          const optionPayload = {
            label: `${tempWallet?.walletName}: ${tempCoinDetails?.address}`,
            value: tempCoinDetails?.address,
            options: {
              coinDetails: tempCoinDetails,
              walletDetails: selectedWalletDetails,
            },
          };
          possibleCoinDetails.push(optionPayload);
        }
      }
      return {
        selectedCoinDetails,
        possibleCoinDetails,
        selectedWalletDetails,
      };
    },
    [allWallets, currentWalletClientId],
  );

  // Keep the "Select address" wallet lists in sync when the set of visible
  // wallets changes (e.g. a hidden wallet was revealed). Without this,
  // possibleFromCoin/possibleToCoins stay stale until the coin is re-selected.
  // Only the address options are recomputed here; the selected asset/amount are
  // left untouched.
  useEffect(() => {
    const updatedFields = {};
    if (selectedCoinFromOptions) {
      const {possibleCoinDetails} = getCoinDetails(selectedCoinFromOptions);
      updatedFields.possibleFromCoin = possibleCoinDetails;
    }
    if (selectedCoinToOptions) {
      const {possibleCoinDetails} = getCoinDetails(selectedCoinToOptions);
      updatedFields.possibleToCoins = [
        ...possibleCoinDetails,
        {
          label: 'Custom',
          value: 'Custom',
          options: {coinDetails: {}, walletDetails: {}},
        },
      ];
    }
    if (Object.keys(updatedFields).length) {
      dispatch(setExchangeFields(updatedFields));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWallets]);

  const onChangeFromValues = useCallback(
    event => {
      const value = event?.target?.value;
      const item = coinOptions.find(item => item.value === value);
      const {possibleCoinDetails, selectedCoinDetails, selectedWalletDetails} =
        getCoinDetails(item);
      const balance = selectedCoinDetails?.totalAmount;
      const tempSliderValue = calculateSliderValue(balance, amountFrom);

      dispatch(
        setExchangeFields({
          selectedCoinFromOptions: item,
          possibleFromCoin: possibleCoinDetails,
          selectedFromAsset: selectedCoinDetails,
          selectedFromWallet: selectedWalletDetails,
          sliderValue: tempSliderValue,
        }),
      );
    },
    [amountFrom, coinOptions, dispatch, getCoinDetails],
  );

  const getExchangeQuoteForFrom = useCallback(
    async (localSelectFromAsset, localSelectToAsset, localAmount) => {
      const fromSymbol = localSelectFromAsset?.symbol;
      const fromNetwork = localSelectFromAsset?.chain_symbol;
      const toSymbol = localSelectToAsset?.symbol;
      const toNetwork = localSelectToAsset?.chain_symbol;
      let key = null;
      if (fromSymbol && fromNetwork && toNetwork && toSymbol) {
        key = `${fromNetwork}:${fromSymbol}_${toNetwork}:${toSymbol}`;
      }
      const minimumValue = minimumAmountRef.current[key];
      const minimumValueBN = new BigNumber(minimumValue);
      const fromAmountBN = new BigNumber(localAmount);
      if (
        fromSymbol &&
        localSelectToAsset?.symbol &&
        (!minimumValue || fromAmountBN.gte(minimumValueBN))
      ) {
        setIsFetching({from: true, to: true});
        const payload = {
          coinFrom: fromSymbol,
          coinTo: localSelectToAsset?.symbol,
          networkFrom: fromNetwork,
          networkTo: localSelectToAsset?.chain_symbol,
          amount: localAmount ? localAmount : '0',
          rateType: 'fixed',
          fromChainName: localSelectFromAsset?.chain_name,
          toChainName: localSelectToAsset?.chain_name,
          fromContractAddress: localSelectFromAsset?.contractAddress,
          toContractAddress: localSelectToAsset?.contractAddress,
          isFetchMinimum: true,
        };
        if (!minimumValue) {
          payload.amount = null;
        }
        const resp = await getExchangeQuote(payload);
        const data = resp?.data;
        const selectedProvider = data?.[0];
        const finalAvailableProviders = data;
        const minAmount = selectedProvider?.minAmount;
        if (minAmount) {
          minimumAmountRef.current[key] = minAmount;
        }
        const toAmount = selectedProvider?.toAmount;
        const fromAmount = selectedProvider?.fromAmount;
        if (toAmount) {
          const tempFiatPay = multiplyBNWithFixed(
            fromAmount,
            selectedFromAsset?.currencyRate,
            2,
          );
          dispatch(
            setExchangeFields({
              fiatPay: tempFiatPay,
              amountFrom: fromAmount + '',
              amountTo: toAmount + '',
              extraData: selectedProvider?.extraData,
              selectedExchangeChain: selectedProvider,
              availableProviders: finalAvailableProviders,
              sliderValue: calculateSliderValue(
                selectedFromAsset?.totalAmount,
                fromAmount,
              ),
            }),
          );
        } else {
          dispatch(
            setExchangeFields({
              amountTo: '0',
              availableProviders: [],
            }),
          );
        }
        setIsFetching({from: false, to: false});
      }
    },
    [dispatch, selectedFromAsset?.currencyRate, selectedFromAsset?.totalAmount],
  );

  useEffect(() => {
    getExchangeQuoteForFrom(
      selectedFromAsset,
      selectedToAsset,
      amountFrom,
    ).then();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFromAsset, selectedToAsset]);

  const onChangeToValues = useCallback(
    event => {
      const value = event?.target?.value;
      const item = coinOptions.find(item => item.value === value);
      const {possibleCoinDetails, selectedCoinDetails} = getCoinDetails(item);
      const customPayload = {
        label: 'Custom',
        value: 'Custom',
        options: {
          coinDetails: {},
          walletDetails: {},
        },
      };
      dispatch(
        setExchangeFields({
          selectedCoinToOptions: item,
          possibleToCoins: [...possibleCoinDetails, customPayload],
          selectedToAsset: selectedCoinDetails,
        }),
      );
    },
    [coinOptions, dispatch, getCoinDetails],
  );

  const onSelectFromAsset = useCallback(
    event => {
      const value = event?.target?.value;
      const item = possibleFromCoin.find(item => item.value === value);
      dispatch(
        setExchangeFields({
          selectedFromAsset: item.options?.coinDetails,
          selectedFromWallet: item.options?.walletDetails,
        }),
      );
    },
    [dispatch, possibleFromCoin],
  );

  const onSelectToAsset = useCallback(
    event => {
      const value = event?.target?.value;
      const item = possibleToCoins.find(item => item.value === value);
      if (item?.value === 'Custom') {
        dispatch(setExchangeFields({customOption: item?.value}));
      } else {
        dispatch(
          setExchangeFields({
            selectedToAsset: item?.options?.coinDetails,
            customOption: '',
          }),
        );
      }
    },
    [dispatch, possibleToCoins],
  );

  const onPressSwap = useCallback(() => {
    const tempPossibleToCoin = structuredClone(possibleFromCoin);
    const tempPossibleFromCoin = structuredClone(possibleToCoins);
    const tempSelectedFromAssets = structuredClone(selectedToAsset);
    const tempSelectedToAssets = structuredClone(selectedFromAsset);
    const tempSelectedCoinFromOptions = structuredClone(selectedCoinToOptions);
    const tempSelectedCoinToOptions = structuredClone(selectedCoinFromOptions);
    dispatch(
      setExchangeFields({
        selectedCoinFromOptions: tempSelectedCoinFromOptions,
        selectedCoinToOptions: tempSelectedCoinToOptions,
        selectedToAsset: tempSelectedToAssets,
        selectedFromAsset: tempSelectedFromAssets,
        possibleToCoins: tempPossibleToCoin,
        possibleFromCoin: tempPossibleFromCoin,
      }),
    );
  }, [
    possibleFromCoin,
    possibleToCoins,
    selectedToAsset,
    selectedFromAsset,
    selectedCoinToOptions,
    selectedCoinFromOptions,
    dispatch,
  ]);

  const onPressProvider = useCallback(
    item => {
      const toAmount = item?.toAmount;
      const fromAmount = item?.fromAmount;
      if (toAmount) {
        const tempFiatPay = multiplyBNWithFixed(
          fromAmount,
          selectedFromAsset?.currencyRate,
          2,
        );
        dispatch(
          setExchangeFields({
            fiatPay: tempFiatPay,
            amountFrom: fromAmount + '',
            amountTo: toAmount + '',
            extraData: item?.extraData,
            selectedExchangeChain: item,
            sliderValue: calculateSliderValue(
              selectedFromAsset?.totalAmount,
              fromAmount,
            ),
          }),
        );
      }
    },
    [dispatch, selectedFromAsset?.currencyRate, selectedFromAsset?.totalAmount],
  );

  const onSliderValueChange = useCallback(
    (e, value) => {
      dispatch(setExchangeFields({sliderValue: value}));
      const balance = selectedFromAsset?.totalAmount;
      if (balance) {
        const balanceBN = new BigNumber(balance);
        const valueBN = new BigNumber(value);
        const amount = balanceBN
          .multipliedBy(valueBN)
          .dividedBy(new BigNumber(100))
          .toFixed(6);
        handleFromChange(
          {
            target: {
              value: amount,
            },
          },
          true,
        ).then();
      }
    },
    [dispatch, handleFromChange, selectedFromAsset?.totalAmount],
  );

  const fromSymbol = selectedFromAsset?.symbol;
  const fromNetwork = selectedFromAsset?.chain_symbol;
  let minimumValue = null;
  const toSymbol = selectedToAsset?.symbol;
  const toNetwork = selectedToAsset?.chain_symbol;
  if (fromSymbol && fromNetwork && toNetwork && toSymbol) {
    minimumValue = selectedExchangeChain?.minAmount || null;
  }
  const isMinimumValueGreater = minimumValue > amountFrom;
  const isBalanceLess = new BigNumber(selectedFromAsset?.totalAmount).lt(
    new BigNumber(amountFrom),
  );
  const balance = isNaN(selectedFromAsset?.totalAmount)
    ? ''
    : Number(selectedFromAsset?.totalAmount).toFixed(6) || '';
  const isCustomAddressRequire = customOption === 'Custom' && !customAddress;

  const isButtonDisabled =
    !amountFrom ||
    !minimumValue ||
    !validateNumber(amountTo) ||
    isMinimumValueGreater ||
    isBalanceLess ||
    isCustomAddressRequire ||
    isFetching.to;

  return (
    <div className={s.container}>
      {modalAddCoinsVisible && (
        <ModalAddCoins
          visible={modalAddCoinsVisible}
          hideModal={setModalAddCoinsVisible}
        />
      )}
      <div className={s.lable}>
        <h3 className={s.title}>FROM</h3>
        <p className={s.amountAvailableText}>
          <span>Available amount:</span>
          {balance || ''}
          {` ${selectedCoinFromOptions?.options?.symbol || ''}`}
        </p>
      </div>
      <div className={s.inputFrom}>
        <div className={s.inputsWrapper}>
          <div className={s.selectWrapper}>
            <SelectInputExchange
              key={'fromExchange'}
              listData={coinOptions}
              selectedValue={selectedCoinFromOptions?.value ?? ' '}
              onValueChange={onChangeFromValues}
            />
          </div>
          <div className={s.inputWrapper}>
            <label>
              {isFetching?.from ? (
                <div className={s.loaderWrapper}>
                  <Loading size={24} height='auto' />
                </div>
              ) : (
                <input
                  className={s.coinTitle}
                  style={{
                    color: isBalanceLess ? '#ff0000' : 'var(--font)',
                    flex: 1,
                    textAlign: 'right',
                  }}
                  value={amountFrom}
                  onChange={handleFromChange}
                  type='number'
                  placeholder='0.0'
                />
              )}
              {icons.arrRight}
            </label>
          </div>
        </div>
      </div>
      {!!minimumValue && isMinimumValueGreater && (
        <p
          className={
            s.errorText
          }>{`Minimum value is ${minimumValue} ${selectedFromAsset?.symbol}`}</p>
      )}
      {isBalanceLess && (
        <p
          className={
            s.errorText
          }>{`You don't have ${amountFrom} ${selectedFromAsset?.symbol}`}</p>
      )}
      {!!Number(selectedFromAsset?.totalAmount) && (
        <div className={s.sliderView}>
          <DokSlider
            valueLabelDisplay='auto'
            aria-label='Volume'
            value={sliderValue}
            onChange={onSliderValueChange}
            valueLabelFormat={value => `${value}%`}
          />
        </div>
      )}
      {!!possibleFromCoin?.length && (
        <div className={s.addressViewWrapper}>
          <h3 className={s.title}>Select address</h3>
          <div className={s.addressViev}>
            <DokDropdown
              key={selectedFromAsset?.address}
              listData={possibleFromCoin}
              placeholder={'Select address'}
              onValueChange={onSelectFromAsset}
              value={selectedFromAsset?.address}
            />
          </div>
        </div>
      )}
      <div className={s.curvedIcon}>
        <button onClick={onPressSwap}>{icons.sCurved}</button>
      </div>
      <div className={s.lable}>
        <h3 className={s.title}>TO</h3>
      </div>
      <div className={s.inputFrom}>
        <div className={s.inputsWrapper}>
          <div className={s.selectWrapper}>
            <SelectInputExchange
              key={'toExchange'}
              listData={coinOptions}
              selectedValue={selectedCoinToOptions?.value ?? ''}
              onValueChange={onChangeToValues}
            />
          </div>
          <div className={s.inputWrapper}>
            <label>
              {isFetching?.to ? (
                <div className={s.loaderWrapper}>
                  <Loading size={24} height='auto' />
                </div>
              ) : (
                <input
                  className={s.coinTitle}
                  style={{
                    flex: 1,
                    textAlign: 'right',
                  }}
                  value={amountTo}
                  readOnly
                  type='number'
                  placeholder='0.0'
                />
              )}
              {icons.arrRight}
            </label>
          </div>
        </div>
      </div>
      <div className={s.rowView}>
        <p className={s.text} style={{fontWeight: 700}}>
          {'Looking for more coins?'}
        </p>
        <p
          className={s.highlightText}
          onClick={e => setModalAddCoinsVisible(true)}>
          {'Click here for add coins on selected wallet'}
        </p>
      </div>
      {!!possibleToCoins?.length && (
        <div className={s.addressViewWrapper}>
          <h3 className={s.title}>Select address</h3>
          <div className={s.addressViev}>
            <DokDropdown
              key={selectedToAsset?.address}
              listData={possibleToCoins}
              placeholder={'Select address'}
              onValueChange={onSelectToAsset}
              value={customOption || selectedToAsset?.address}
            />
          </div>
        </div>
      )}
      {customOption === 'Custom' && (
        <TextField
          style={{width: '100%', marginTop: 20}}
          label='To Address'
          placeholder={'Enter to address'}
          sx={{
            '& fieldset': {
              borderColor: 'var(--whiteOutline) !important',
            },
          }}
          name='To Address'
          autoFocus={true}
          onChange={event => {
            dispatch(setExchangeFields({customAddress: event?.target.value}));
          }}
          value={customAddress}
          slotProps={{
            inputLabel: {style: {color: 'var(--sidebarIcon)'}},
          }}
        />
      )}
      {!isFetching?.to && !!availableProviders?.length && (
        <>
          <h3 className={s.title} style={{marginTop: 16}}>
            Exchange Providers
          </h3>
          {availableProviders?.map(item => (
            <ExchangeProviderItem
              key={item?.providerName}
              item={item}
              selectedToAsset={selectedToAsset}
              selectedFromAsset={selectedFromAsset}
              selectedExchangeChain={selectedExchangeChain}
              onPressItem={onPressProvider}
            />
          ))}
        </>
      )}
      <div className={s.textContainer}>
        <p className={s.text}>Minimum amount</p>
        <div className={s.amountAvailable}>
          <p className={s.textValue}>{`${minimumValue || 0} ${
            selectedFromAsset?.symbol || ''
          }`}</p>
        </div>
      </div>
      <div className={s.textContainer}>
        <p className={s.text} style={{fontWeight: 700}}>
          You pay
        </p>
        <div className={s.amountAvailable}>
          <p className={s.textValue} style={{fontWeight: 700}}>
            {amountFrom || '0.0'} {selectedCoinFromOptions?.options?.symbol}
          </p>
        </div>
      </div>
      <div className={s.textContainer}>
        <p className={s.text} style={{fontWeight: 700}}>
          You pay in fiat
        </p>
        <div className={s.amountAvailable}>
          <p className={s.textValue} style={{fontWeight: 700}}>
            {`${currencySymbol[localCurrency]}${fiatPay || '0.0'}`}
          </p>
        </div>
      </div>
      <div className={s.boxFooter}>
        <p className={s.textStyle}>
          {`Swap services are available through third-party API provider (${exchangeProviderText}).`}
        </p>

        {customOption === 'Custom' && (
          <p className={[s.warningText]}>
            {'Please ensure the custom wallet address before exchanging.'}
          </p>
        )}
        <button
          className={s.button}
          style={{
            backgroundColor: isButtonDisabled ? '#708090' : 'var(--background)',
            borderBlockColor: isButtonDisabled
              ? '#708090'
              : 'var(--background)',
          }}
          onClick={handleSubmit}
          disabled={isButtonDisabled}>
          <p className={s.buttonTitle}>Next</p>
        </button>
      </div>
    </div>
  );
};

export default Exchange;
