'use client';
import React, {useCallback, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useRouter} from 'next/navigation';
import {
  selectCoinSyncStatus,
  selectCoinSyncProgress,
  selectCurrentSyncingCoin,
  selectCoinsWithBalance,
  selectCoinsWithBalanceCount,
  selectIsCreatingWallets,
  selectIsSyncing,
  selectSelectedCount,
  selectSyncingWalletIndex,
  selectSyncingWalletName,
} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSelectors';
import {
  syncAllCoins,
  cancelSync,
  resetCoinSync,
  toggleCoinSelection,
} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSlice';
import {addCoinsToWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {showToast} from 'src/utils/toast';
import CoinSyncProgress from 'components/CoinSyncProgress';
import CoinSyncItem from 'components/CoinSyncItem';
import CoinSyncActionButton from 'components/CoinSyncActionButton';
import CoinSyncEmptyState from 'components/CoinSyncEmptyState';
import ArrowBack from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import CircularProgress from '@mui/material/CircularProgress';
import styles from './CoinSync.module.css';

const CoinSync = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const status = useSelector(selectCoinSyncStatus);
  const progress = useSelector(selectCoinSyncProgress);
  const currentCoin = useSelector(selectCurrentSyncingCoin);
  const coinsWithBalance = useSelector(selectCoinsWithBalance);
  const coinsWithBalanceCount = useSelector(selectCoinsWithBalanceCount);
  const isCreatingWallets = useSelector(selectIsCreatingWallets);
  const isSyncing = useSelector(selectIsSyncing);
  const selectedCount = useSelector(selectSelectedCount);
  const syncingWalletIndex = useSelector(selectSyncingWalletIndex);
  const syncingWalletName = useSelector(selectSyncingWalletName);

  const isCompleted = status === 'completed';

  const resultsHeaderText = useMemo(() => {
    if (!isCompleted) return '';
    return coinsWithBalanceCount > 0 ? 'Select coins to add' : '';
  }, [isCompleted, coinsWithBalanceCount]);

  const pageTitle = useMemo(() => {
    if (syncingWalletName && (isSyncing || isCompleted)) {
      return `Sync · ${syncingWalletName}`;
    }
    return 'Sync Coin Balances';
  }, [syncingWalletName, isSyncing, isCompleted]);

  const handleStartSync = useCallback(() => {
    dispatch(syncAllCoins());
  }, [dispatch]);

  const handleCancel = useCallback(() => {
    dispatch(cancelSync());
  }, [dispatch]);

  const handleGoBack = useCallback(() => {
    if (isCreatingWallets) return;
    if (!isSyncing) {
      dispatch(resetCoinSync());
    }
    router.back();
  }, [dispatch, router, isSyncing, isCreatingWallets]);

  const handleToggleSelection = useCallback(
    index => {
      dispatch(toggleCoinSelection(index));
    },
    [dispatch],
  );

  const handleAddSelectedCoins = useCallback(() => {
    const selectedCoins = coinsWithBalance.filter(c => c.isSelected);
    if (selectedCoins.length === 0) {
      dispatch(resetCoinSync());
      router.back();
      return;
    }
    dispatch(
      addCoinsToWallet({coins: selectedCoins, walletIndex: syncingWalletIndex}),
    );
    showToast({
      type: 'successToast',
      title: 'Coins Added',
      message: `Added ${selectedCoins.length} coin${selectedCoins.length !== 1 ? 's' : ''} to your wallet`,
    });
    dispatch(resetCoinSync());
    router.back();
  }, [coinsWithBalance, dispatch, router, syncingWalletIndex]);

  return (
    <div className={styles.safeArea}>
      <div className={styles.container}>
        <div className={styles.navHeader}>
          <IconButton
            onClick={handleGoBack}
            disabled={isCreatingWallets}
            sx={{
              '& .MuiSvgIcon-root': {
                color: isCreatingWallets ? 'var(--gray)' : 'var(--font)',
              },
            }}>
            <ArrowBack />
          </IconButton>
          <h3 className={styles.title}>{pageTitle}</h3>
          <div className={styles.placeholder} />
        </div>

        <div className={styles.scrollArea}>
          <CoinSyncProgress
            progress={progress}
            currentCoin={currentCoin}
            isSyncing={isSyncing}
            status={status}
            syncingWalletName={syncingWalletName}
          />

          {coinsWithBalanceCount > 0 && resultsHeaderText && (
            <p className={styles.resultsHeader}>{resultsHeaderText}</p>
          )}

          {coinsWithBalance.length > 0 ? (
            coinsWithBalance.map((item, index) => (
              <CoinSyncItem
                key={item._id || `${item.symbol}_${index}`}
                coin={item}
                isSelectable={isCompleted}
                isSelected={item.isSelected}
                onToggle={() => handleToggleSelection(index)}
              />
            ))
          ) : (
            <CoinSyncEmptyState status={status} />
          )}
        </div>

        <CoinSyncActionButton
          status={status}
          onStartSync={handleStartSync}
          onCancel={handleCancel}
          onAddCoins={handleAddSelectedCoins}
          selectedCount={selectedCount}
          totalCoinsWithBalance={coinsWithBalanceCount}
          disabled={isCreatingWallets}
        />
      </div>

      <Modal open={isCreatingWallets} disableEscapeKeyDown>
        <div className={styles.blockerOverlay}>
          <div className={styles.blockerDialog}>
            <CircularProgress size={40} sx={{color: 'var(--background)'}} />
            <p className={styles.blockerTitle}>Creating wallets...</p>
            <p className={styles.blockerSubtitle}>
              Please wait, do not close the website.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CoinSync;
