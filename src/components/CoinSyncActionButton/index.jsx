'use client';
import React, {memo, useMemo} from 'react';
import GeneralButton from 'components/Button';
import {
  CheckIcon,
  CloseIcon,
  PlusIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import {ResetIcon} from 'components/Transactions/TxIcons';
import styles from './CoinSyncActionButton.module.css';

// The scan's single main action: Start scan → Cancel → Add N coins / Done,
// or Retry after an error. Pinned to the bottom of the screen.
const CoinSyncActionButton = ({
  status,
  onStartSync,
  onCancel,
  onAddCoins,
  selectedCount,
  totalCoinsWithBalance,
  disabled,
}) => {
  const config = useMemo(() => {
    if (status === 'idle') {
      return {Icon: SearchIcon, text: 'Start scan', onPress: onStartSync};
    }
    if (
      status === 'syncing' ||
      status === 'creating_wallets' ||
      status === 'fetching'
    ) {
      return {
        Icon: CloseIcon,
        text: 'Cancel scan',
        variant: 'secondary',
        onPress: onCancel,
        disabled,
      };
    }
    if (status === 'completed') {
      const hasCoins = totalCoinsWithBalance > 0;
      return {
        Icon: hasCoins ? PlusIcon : CheckIcon,
        text: hasCoins
          ? `Add ${selectedCount} coin${selectedCount !== 1 ? 's' : ''}`
          : 'Done',
        onPress: onAddCoins,
        disabled: hasCoins && selectedCount === 0,
      };
    }
    if (status === 'error') {
      return {Icon: ResetIcon, text: 'Retry', onPress: onStartSync};
    }
    return null;
  }, [
    status,
    onStartSync,
    onCancel,
    onAddCoins,
    selectedCount,
    totalCoinsWithBalance,
    disabled,
  ]);

  if (!config) return null;

  const {Icon, text, variant, onPress, disabled: isDisabled} = config;

  return (
    <div className={styles.footer}>
      <GeneralButton
        fullWidth
        variant={variant}
        className={styles.button}
        disabled={!!isDisabled}
        onClick={onPress}>
        <Icon size={19} />
        {text}
      </GeneralButton>
    </div>
  );
};

export default memo(CoinSyncActionButton);
