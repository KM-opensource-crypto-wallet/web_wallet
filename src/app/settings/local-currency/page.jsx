'use client';
import {useEffect, useRef} from 'react';

import {currencySymbol, localCurrencyList} from 'src/data/lists/currency';
import {useSelector, useDispatch} from 'react-redux';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {setLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';

import {refreshCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';

import Screen from 'components/Screen';
import {CheckIcon, InfoIcon} from 'components/Home/HomeIcons';
import s from './LocalCurrency.module.css';

const LocalCurrency = () => {
  const localCurrency = useSelector(getLocalCurrency);
  const dispatch = useDispatch();
  const isButtonClick = useRef(false);

  useEffect(() => {
    if (localCurrency && isButtonClick.current) {
      isButtonClick.current = false;
      dispatch(refreshCoins());
    }
  }, [dispatch, localCurrency]);

  return (
    <Screen className={s.page} title='Local currency'>
      <div className={s.column}>
        <div className={s.card} role='radiogroup' aria-label='Local currency'>
          {localCurrencyList?.map(item => {
            const selected = localCurrency === item.id;
            return (
              <button
                key={item.id}
                type='button'
                role='radio'
                aria-checked={selected}
                className={`${s.row} ${selected ? s.rowActive : ''}`}
                onClick={() => {
                  if (selected) {
                    return;
                  }
                  isButtonClick.current = true;
                  dispatch(setLocalCurrency(item.id));
                }}>
                <span className={s.symbol} aria-hidden='true'>
                  {currencySymbol[item.id] || item.id[0]}
                </span>
                <span className={s.rowText}>
                  <span className={s.rowTitle}>{item.label}</span>
                  <span className={s.rowHint}>{item.id}</span>
                </span>
                <span className={s.check} aria-hidden='true'>
                  {selected ? <CheckIcon size={14} strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <p className={s.note}>
          <InfoIcon size={16} />
          <span>
            Balances, prices and amounts across the wallet are shown in this
            currency.
          </span>
        </p>
      </div>
    </Screen>
  );
};

export default LocalCurrency;
