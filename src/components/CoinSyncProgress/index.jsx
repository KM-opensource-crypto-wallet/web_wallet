'use client';
import React, {memo, useMemo} from 'react';
import {CheckIcon, SearchIcon} from 'components/Home/HomeIcons';
import styles from './CoinSyncProgress.module.css';

const SIZE = 120;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Scan status card: a progress ring (percent while scanning, a spinner while
// preparing, ✓ when done, ! on error), the status line and the coin being
// checked right now.
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
  const isPreparing = isFetching || isCreatingWallets;

  const progressPercent = useMemo(() => {
    if (isCompleted) return 100;
    const raw =
      progress?.totalCoins > 0
        ? (progress.completedCoins / progress.totalCoins) * 100
        : 0;
    return Math.max(0, Math.min(100, raw));
  }, [isCompleted, progress?.completedCoins, progress?.totalCoins]);

  const statusText = useMemo(() => {
    if (isFetching) return 'Loading coins…';
    if (isCreatingWallets) return 'Creating wallets…';
    if (isSyncing)
      return `Scanning ${progress?.completedCoins} of ${progress?.totalCoins}`;
    if (isCompleted) return 'Scan complete';
    if (isError) return 'Something went wrong';
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

  const subText = isError
    ? 'The scan stopped before it finished. You can try again.'
    : isCompleted
      ? 'Every supported coin has been checked for a balance.'
      : isSyncing || isPreparing
        ? 'Keep this page open until the scan finishes.'
        : "We'll check every supported coin for a balance in this wallet.";

  const offset =
    CIRCUMFERENCE * (1 - (isPreparing ? 0 : progressPercent) / 100);

  return (
    <section
      className={styles.card}
      aria-live='polite'
      aria-label='Scan progress'>
      <div className={styles.ring}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden='true'>
          <circle
            className={styles.track}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeWidth={STROKE}
          />
          <circle
            className={`${styles.bar} ${isError ? styles.barError : ''}`}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <span
          className={`${styles.inner} ${isCompleted ? styles.innerDone : ''} ${
            isError ? styles.innerError : ''
          }`}>
          {isError ? (
            <span className={styles.bang}>!</span>
          ) : isCompleted ? (
            <CheckIcon size={36} />
          ) : isPreparing ? (
            <span className={styles.spinner} />
          ) : isSyncing ? (
            <span className={styles.percent}>
              {Math.round(progressPercent)}%
            </span>
          ) : (
            <SearchIcon size={34} />
          )}
        </span>
      </div>

      <p className={styles.status}>{statusText}</p>
      <p className={styles.sub}>{subText}</p>

      {syncingWalletName && (isSyncing || isCompleted) ? (
        <span className={styles.wallet}>{syncingWalletName}</span>
      ) : null}

      {isSyncing && currentCoin ? (
        <span className={styles.current}>
          <span className={styles.currentDot} aria-hidden='true' />
          {currentCoin.name} ({currentCoin.symbol})
          {currentCoin.chain_display_name ? (
            <span className={styles.chain}>
              {currentCoin.chain_display_name}
            </span>
          ) : null}
        </span>
      ) : null}
    </section>
  );
};

export default memo(CoinSyncProgress);
