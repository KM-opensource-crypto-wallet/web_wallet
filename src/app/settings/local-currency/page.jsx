'use client';
import {useEffect, useRef} from 'react';
import {useRouter} from 'next/navigation';

import {currencySymbol, localCurrencyList} from 'src/data/lists/currency';
import {useSelector, useDispatch} from 'react-redux';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {setLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';

import {refreshCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';

import GeneralButton from 'components/Button';
import {CheckIcon, ChevronLeftIcon, InfoIcon} from 'components/Home/HomeIcons';
import s from './LocalCurrency.module.css';

const LocalCurrency = () => {
  const router = useRouter();
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
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <h1 className={s.title}>Local currency</h1>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>

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
    </main>
  );
};

export default LocalCurrency;
