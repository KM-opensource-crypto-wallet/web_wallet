'use client';
import React, {memo, useMemo} from 'react';
import styles from './CoinSyncEmptyState.module.css';

const EMPTY_STATE_CONFIG = {
  fetching: {
    title: 'Loading coins...',
    subtitle: 'Fetching available coins to scan',
  },
  creating_wallets: {
    title: 'Preparing wallets...',
    subtitle: 'Creating wallets for different chains',
  },
  syncing: {
    title: 'Scanning for balances...',
    subtitle: 'Checking all coins for balances',
  },
  idle: {
    title: 'Scan for coins',
    subtitle: "We'll check all supported coins for balances",
  },
  completed: {
    title: 'All caught up!',
    subtitle: 'No additional coins with balance found',
  },
};

const CoinSyncEmptyState = ({status}) => {
  const config = useMemo(() => {
    if (status === 'fetching') return EMPTY_STATE_CONFIG.fetching;
    if (status === 'creating_wallets')
      return EMPTY_STATE_CONFIG.creating_wallets;
    if (status === 'syncing') return EMPTY_STATE_CONFIG.syncing;
    if (status === 'idle') return EMPTY_STATE_CONFIG.idle;
    if (status === 'completed') return EMPTY_STATE_CONFIG.completed;
    return null;
  }, [status]);

  if (!config) return null;

  return (
    <div className={styles.container}>
      <p className={styles.title}>{config.title}</p>
      <p className={styles.subtitle}>{config.subtitle}</p>
    </div>
  );
};

export default memo(CoinSyncEmptyState);
