'use client';
import React, {memo, useMemo} from 'react';
import styles from './CoinSyncEmptyState.module.css';

const EMPTY_STATE_CONFIG = {
  fetching: {
    title: 'Loading coins…',
    subtitle: 'Fetching the coins to scan',
  },
  creating_wallets: {
    title: 'Preparing wallets…',
    subtitle: 'Creating addresses for each chain',
  },
  syncing: {
    title: 'Scanning for balances…',
    subtitle: 'Coins with a balance will appear here as they are found',
  },
  idle: {
    title: 'Find coins you already hold',
    subtitle:
      'Scanning can run once every 24 hours per wallet. Found coins can be added to this wallet.',
  },
  completed: {
    title: 'All caught up',
    subtitle: 'No other coins with a balance were found',
  },
};

// Placeholder under the progress card while no coins have been found.
const CoinSyncEmptyState = ({status}) => {
  const config = useMemo(() => EMPTY_STATE_CONFIG[status] || null, [status]);

  if (!config) return null;

  return (
    <div className={styles.container}>
      <p className={styles.title}>{config.title}</p>
      <p className={styles.subtitle}>{config.subtitle}</p>
    </div>
  );
};

export default memo(CoinSyncEmptyState);
