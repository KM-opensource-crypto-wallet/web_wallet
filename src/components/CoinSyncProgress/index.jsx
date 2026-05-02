'use client';
import React, {memo, useMemo} from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import ManageSearch from '@mui/icons-material/ManageSearch';
import styles from './CoinSyncProgress.module.css';

const CIRCLE_SIZE = 120;

const CoinSyncProgress = ({
  progress,
  currentCoin,
  isSyncing,
  status,
  syncingWalletName,
}) => {
  const isCreatingWallets = status === 'creating_wallets';
  const isCompleted = status === 'completed';
  const isError = status === 'error';
  const isFetching = status === 'fetching';

  const progressPercent = useMemo(() => {
    if (isCompleted) return 100;
    const raw =
      progress?.totalCoins > 0
        ? (progress.completedCoins / progress.totalCoins) * 100
        : 0;
    return Math.max(0, Math.min(100, raw));
  }, [isCompleted, progress?.completedCoins, progress?.totalCoins]);

  const statusText = useMemo(() => {
    if (isFetching) return 'Loading coins...';
    if (isCreatingWallets) return 'Creating wallets...';
    if (isSyncing)
      return `Scanning ${progress?.completedCoins} of ${progress?.totalCoins}`;
    if (isCompleted) return 'Sync Complete!';
    if (isError) return 'Error occurred';
    return 'Ready to scan';
  }, [
    isFetching,
    isCreatingWallets,
    isSyncing,
    isCompleted,
    isError,
    progress?.completedCoins,
    progress?.totalCoins,
  ]);

  const renderInnerContent = () => {
    if (isError) return <ErrorOutline sx={{fontSize: 40, color: '#f44336'}} />;
    if (isCompleted)
      return <CheckCircle sx={{fontSize: 40, color: 'var(--background)'}} />;
    if (isFetching || isCreatingWallets)
      return <CircularProgress size={36} sx={{color: 'var(--background)'}} />;
    if (isSyncing)
      return (
        <span className={styles.percentText}>
          {Math.round(progressPercent)}%
        </span>
      );
    return <ManageSearch sx={{fontSize: 40, color: 'var(--background)'}} />;
  };

  return (
    <div className={styles.container}>
      <Box
        sx={{
          position: 'relative',
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {/* Track circle */}
        <CircularProgress
          variant='determinate'
          value={100}
          size={CIRCLE_SIZE}
          thickness={4}
          sx={{color: 'var(--walletItemColor)', position: 'absolute'}}
        />
        {/* Progress circle */}
        <CircularProgress
          variant='determinate'
          value={isFetching || isCreatingWallets ? 0 : progressPercent}
          size={CIRCLE_SIZE}
          thickness={4}
          sx={{
            color: isError ? '#f44336' : 'var(--background)',
            position: 'absolute',
          }}
        />
        <div className={styles.innerContent}>{renderInnerContent()}</div>
      </Box>

      <p className={styles.statusText}>{statusText}</p>

      {syncingWalletName && (isSyncing || isCompleted) && (
        <p className={styles.walletName}>Scanning: {syncingWalletName}</p>
      )}

      {isSyncing && currentCoin && (
        <div className={styles.currentCoinContainer}>
          <p className={styles.currentCoinText}>
            {currentCoin.name} ({currentCoin.symbol})
          </p>
          {currentCoin.chain_display_name && (
            <p className={styles.chainNameText}>
              {currentCoin.chain_display_name}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(CoinSyncProgress);
