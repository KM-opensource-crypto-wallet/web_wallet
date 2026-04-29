'use client';
import React, {useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useRouter} from 'next/navigation';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Close from '@mui/icons-material/Close';
import ChevronRight from '@mui/icons-material/ChevronRight';
import WalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import {
  selectCoinSyncStatus,
  selectCoinSyncProgress,
  selectIsSyncing,
  selectIsCreatingWallets,
  selectIsFetching,
  selectIsBannerDismissed,
  selectSyncingWalletName,
} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSelectors';
import {
  dismissBanner,
  cancelSync,
} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSlice';
import {
  selectCurrentWalletClientId,
  isCoinsScanTimestampValid,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import styles from './CoinSyncBanner.module.css';

const CoinSyncBanner = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const status = useSelector(selectCoinSyncStatus);
  const progress = useSelector(selectCoinSyncProgress);
  const isSyncing = useSelector(selectIsSyncing);
  const isCreatingWallets = useSelector(selectIsCreatingWallets);
  const isFetching = useSelector(selectIsFetching);
  const isBannerDismissed = useSelector(selectIsBannerDismissed);
  const syncingWalletName = useSelector(selectSyncingWalletName);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const isValidTimestamp = useSelector(isCoinsScanTimestampValid);

  const isCompleted = status === 'completed';
  const isFailed = status === 'error';

  const progressPercent =
    progress.totalCoins > 0
      ? Math.round((progress.completedCoins / progress.totalCoins) * 100)
      : 0;

  const getTitle = () => {
    if (isSyncing) return 'Scanning Assets...';
    if (isCompleted) return 'Scan Completed';
    if (isFailed) return 'Scan Failed';
    return 'Find My Assets';
  };

  const getSubtitle = () => {
    if (isFetching) return 'Preparing asset scan...';
    if (isCreatingWallets) return 'Preparing chain wallets...';
    if (isSyncing) {
      const prefix = syncingWalletName ? `${syncingWalletName} · ` : '';
      return `${prefix}${progress.completedCoins} of ${progress.totalCoins} assets checked`;
    }
    if (isCompleted) {
      const prefix = syncingWalletName ? `${syncingWalletName} · ` : '';
      return `${prefix}Scan finished. Tap to view results.`;
    }
    if (isFailed) return 'Something went wrong. Try scanning again.';
    return 'Scan 200+ coins to find your assets';
  };

  const handleBannerClick = useCallback(() => {
    router.push('/find-my-assets');
  }, [router]);

  const handleClose = useCallback(
    e => {
      e.stopPropagation();
      if (isSyncing) {
        dispatch(cancelSync());
      } else {
        dispatch(dismissBanner(currentWalletClientId));
      }
    },
    [dispatch, isSyncing, currentWalletClientId],
  );

  const shouldHide =
    (!isValidTimestamp || isBannerDismissed) &&
    !isSyncing &&
    !isCompleted &&
    !isFailed;

  if (shouldHide) return null;

  const handleBannerKeyDown = e => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBannerClick();
    }
  };

  return (
    <div
      className={styles.banner}
      onClick={handleBannerClick}
      role='button'
      tabIndex={0}
      onKeyDown={handleBannerKeyDown}>
      <div className={styles.iconContainer}>
        {isFetching || isCreatingWallets ? (
          <div className={styles.spinnerWrapper}>
            <div className={styles.spinner} />
          </div>
        ) : isCompleted ? (
          <CheckCircle className={styles.iconCompleted} />
        ) : isFailed ? (
          <ErrorOutline className={styles.iconFailed} />
        ) : isSyncing ? (
          <div className={styles.progressCircle}>
            <span className={styles.progressPercent}>{progressPercent}%</span>
          </div>
        ) : (
          <WalletOutlined className={styles.iconDefault} />
        )}
      </div>

      <div className={styles.textContainer}>
        <p className={styles.title}>{getTitle()}</p>
        <p className={styles.subtitle}>{getSubtitle()}</p>
        {isSyncing && progress.totalCoins > 0 && (
          <LinearProgress
            variant='determinate'
            value={progressPercent}
            className={styles.progressBar}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'var(--background)',
              },
            }}
          />
        )}
      </div>

      <div className={styles.actionContainer}>
        <ChevronRight className={styles.chevron} />
        <IconButton
          size='small'
          onClick={handleClose}
          aria-label={isSyncing ? 'Cancel scan' : 'Dismiss'}
          sx={{'& .MuiSvgIcon-root': {color: 'var(--gray)', fontSize: 20}}}>
          <Close />
        </IconButton>
      </div>
    </div>
  );
};

export default CoinSyncBanner;
