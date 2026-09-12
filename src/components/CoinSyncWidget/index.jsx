'use client';
import React, {memo, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useRouter, usePathname} from 'next/navigation';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import {
  selectShouldShowWidget,
  selectWidgetData,
} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSelectors';
import {syncAllCoins} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSlice';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import styles from './CoinSyncWidget.module.css';

const CoinSyncWidget = () => {
  const router = useRouter();
  const pathname = usePathname();

  const shouldShowWidget = useSelector(selectShouldShowWidget);
  const widgetData = useSelector(selectWidgetData);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);

  const handlePress = useCallback(() => {
    router.push(`/wallet/${currentWalletClientId}/home/coin-sync`);
  }, [router, currentWalletClientId]);

  // next.config.js sets trailingSlash: true, so pathname ends in '/'
  if (!shouldShowWidget || pathname?.endsWith('/home/coin-sync/')) {
    return null;
  }

  const progressPercent =
    widgetData.totalCoins > 0
      ? (widgetData.completedCoins / widgetData.totalCoins) * 100
      : 0;

  return (
    <button className={styles.container} onClick={handlePress}>
      <Box
        sx={{
          position: 'relative',
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
        <CircularProgress
          variant='determinate'
          value={100}
          size={44}
          thickness={4}
          sx={{color: 'rgba(255,255,255,0.3)', position: 'absolute'}}
        />
        <CircularProgress
          variant='determinate'
          value={progressPercent}
          size={44}
          thickness={4}
          sx={{color: '#fff', position: 'absolute'}}
        />
        <span className={styles.percentText}>
          {Math.round(progressPercent)}%
        </span>
      </Box>

      <div className={styles.textContainer}>
        <p className={styles.progressText}>
          {widgetData.completedCoins}/{widgetData.totalCoins}
        </p>
        <p className={styles.labelText}>
          {widgetData.isFetching ? 'Loading...' : 'Syncing coins'}
        </p>
      </div>
    </button>
  );
};

export default memo(CoinSyncWidget);
