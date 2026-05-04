'use client';
import React, {memo, useMemo} from 'react';
import ManageSearch from '@mui/icons-material/ManageSearch';
import Close from '@mui/icons-material/Close';
import Refresh from '@mui/icons-material/Refresh';
import Add from '@mui/icons-material/Add';
import Check from '@mui/icons-material/Check';
import styles from './CoinSyncActionButton.module.css';

const CoinSyncActionButton = ({
  status,
  onStartSync,
  onCancel,
  onAddCoins,
  selectedCount,
  totalCoinsWithBalance,
  disabled,
}) => {
  const buttonConfig = useMemo(() => {
    if (status === 'idle') {
      return {
        Icon: ManageSearch,
        text: 'Start Scan',
        isCancel: false,
        onPress: onStartSync,
        disabled: false,
      };
    }
    if (
      status === 'syncing' ||
      status === 'creating_wallets' ||
      status === 'fetching'
    ) {
      return {
        Icon: Close,
        text: 'Cancel',
        isCancel: true,
        onPress: onCancel,
        disabled,
      };
    }
    if (status === 'completed') {
      const hasCoins = totalCoinsWithBalance > 0;
      return {
        Icon: hasCoins ? Add : Check,
        text: hasCoins
          ? `Add ${selectedCount} Coin${selectedCount !== 1 ? 's' : ''}`
          : 'Done',
        isCancel: false,
        onPress: onAddCoins,
        disabled: hasCoins && selectedCount === 0,
      };
    }
    if (status === 'error') {
      return {
        Icon: Refresh,
        text: 'Retry',
        isCancel: false,
        onPress: onStartSync,
        disabled: false,
      };
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

  if (!buttonConfig) return null;

  const {Icon, text, isCancel, onPress, disabled: isDisabled} = buttonConfig;

  return (
    <div className={styles.container}>
      <button
        className={`${styles.button} ${isCancel ? styles.buttonCancel : ''} ${isDisabled ? styles.buttonDisabled : ''}`}
        onClick={onPress}
        disabled={isDisabled}>
        <Icon sx={{color: 'white', fontSize: 22}} />
        <span className={styles.buttonText}>{text}</span>
      </button>
    </div>
  );
};

export default memo(CoinSyncActionButton);
