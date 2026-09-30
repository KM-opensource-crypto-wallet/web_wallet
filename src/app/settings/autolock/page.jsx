'use client';
import React, {useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {getLockTime} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {updateLockTime} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import DokRadioButton from 'components/DokRadioButton';
import {WEB_AUTO_LOCK, getWebLockTimeLabel} from 'utils/autoLock';
import s from './AutoLock.module.css';
import GoBackButton from 'components/GoBackButton';

const AutoLock = () => {
  const lockTimeDisplay = getWebLockTimeLabel(useSelector(getLockTime));
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
    <div className={s.container}>
      <GoBackButton />
      <DokRadioButton
        title={'Select a auto lock'}
        options={WEB_AUTO_LOCK}
        checked={lockTimeDisplay}
        setChecked={onChangeLockTime}
      />
    </div>
  );
};

export default AutoLock;
