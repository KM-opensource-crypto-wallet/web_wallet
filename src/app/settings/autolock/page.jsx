'use client';
import React, {useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useDispatch} from 'react-redux';
import {updateLockTime} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import {WEB_AUTO_LOCK, getWebLockTimeLabel} from 'utils/autoLock';
import GeneralButton from 'components/Button';
import {CheckIcon, ChevronLeftIcon, InfoIcon} from 'components/Home/HomeIcons';
import useWallet from 'src/hooks/wallet/useWallet';
import {LockIcon, TimerIcon} from '../SettingsIcons';
import s from './AutoLock.module.css';

const AutoLock = () => {
  const router = useRouter();
  const t = useTranslations('settings');
  const {lockTime} = useWallet();
  const lockTimeDisplay = getWebLockTimeLabel(lockTime);
  const dispatch = useDispatch();

  const onChangeLockTime = useCallback(
    selectedLabel => {
      const foundValue =
        WEB_AUTO_LOCK.find(item => item.label === selectedLabel)?.value || 0;
      dispatch(updateLockTime(foundValue));
    },
    [dispatch],
  );

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
        <h1 className={s.title}>{t('autoLock')}</h1>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>

      <div className={s.column}>
        <p className={s.sectionLabel} id='autolock-label'>
          Lock the wallet
        </p>
        <div
          className={s.card}
          role='radiogroup'
          aria-labelledby='autolock-label'>
          {WEB_AUTO_LOCK.map(item => {
            const selected = lockTimeDisplay === item.label;
            return (
              <button
                key={item.value}
                type='button'
                role='radio'
                aria-checked={selected}
                className={`${s.row} ${selected ? s.rowActive : ''}`}
                onClick={() => onChangeLockTime(item.label)}>
                <span className={s.iconTile} aria-hidden='true'>
                  {item.value === 0 ? (
                    <LockIcon size={19} />
                  ) : (
                    <TimerIcon size={19} />
                  )}
                </span>
                <span className={s.rowTitle}>{item.label}</span>
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
            Once locked, the wallet asks for your password before it can be used
            again.
          </span>
        </p>
      </div>
    </main>
  );
};

export default AutoLock;
