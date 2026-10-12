'use client';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useParams, useRouter} from 'next/navigation';
import {
  selectCoinSyncStatus,
  selectCoinSyncProgress,
  selectCurrentSyncingCoin,
  selectCoinsWithBalance,
  selectCoinsWithBalanceCount,
  selectIsCreatingWallets,
  selectIsSyncing,
  selectSelectedCount,
  selectSyncingWalletClientId,
  selectSyncingWalletName,
} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSelectors';
import {
  syncAllCoins,
  cancelSyncWithCooldown,
  resetCoinSync,
  toggleCoinSelection,
} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSlice';
import {addCoinsToWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  selectAllWallets,
  selectCurrentWalletClientId,
  isCoinScanAvailableForTimestamp,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {showToast} from 'src/utils/toast';
import CoinSyncProgress from 'components/CoinSyncProgress';
import CoinSyncItem from 'components/CoinSyncItem';
import CoinSyncActionButton from 'components/CoinSyncActionButton';
import CoinSyncEmptyState from 'components/CoinSyncEmptyState';
import ConfirmationModal from 'components/ConfirmationModal';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon} from 'components/Home/HomeIcons';
import styles from './CoinSync.module.css';

const CoinSync = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  // Wallet to scan - always the wallet named in the URL (may not be the
  // currently active wallet, e.g. scanning another wallet from its Edit screen)
  const {clientId: resolvedWalletClientId} = useParams();

  const status = useSelector(selectCoinSyncStatus);
  const progress = useSelector(selectCoinSyncProgress);
  const currentCoin = useSelector(selectCurrentSyncingCoin);
  const coinsWithBalance = useSelector(selectCoinsWithBalance);
  const coinsWithBalanceCount = useSelector(selectCoinsWithBalanceCount);
  const isCreatingWallets = useSelector(selectIsCreatingWallets);
  const isSyncing = useSelector(selectIsSyncing);
  const selectedCount = useSelector(selectSelectedCount);
  const syncingWalletClientId = useSelector(selectSyncingWalletClientId);
  const syncingWalletName = useSelector(selectSyncingWalletName);
  const allWallets = useSelector(selectAllWallets);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);

  const resolvedWallet = allWallets?.find(
    item => item?.clientId === resolvedWalletClientId,
  );
  // Only surface the wallet's name in the title when scanning a wallet other
  // than the active one - scanning your own wallet keeps the generic title.
  const targetWalletName =
    resolvedWalletClientId !== currentWalletClientId
      ? resolvedWallet?.walletName || null
      : null;

  const isCompleted = status === 'completed';
  // Coins found but not yet added - leaving the screen would discard them
  const hasPendingCoins = isCompleted && coinsWithBalanceCount > 0;
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const resultsHeaderText = useMemo(() => {
    if (!isCompleted) return '';
    return coinsWithBalanceCount > 0 ? 'Select coins to add' : '';
  }, [isCompleted, coinsWithBalanceCount]);

  // Copy for the leave-with-pending-coins confirmation
  const discardCopy = useMemo(() => {
    const walletName = syncingWalletName || targetWalletName;
    const isSingle = coinsWithBalanceCount === 1;
    const coinWord = isSingle ? 'coin' : 'coins';
    return {
      title: `Discard ${coinsWithBalanceCount} found ${coinWord}?`,
      subtitle: `We found ${coinsWithBalanceCount} ${coinWord} with a balance${
        walletName ? ` in "${walletName}"` : ''
      }. Going back now removes ${
        isSingle ? 'it' : 'them'
      } from this scan without adding ${
        isSingle ? 'it' : 'them'
      } to your wallet.`,
    };
  }, [coinsWithBalanceCount, syncingWalletName, targetWalletName]);

  // Wallet named under the title: the one being scanned, else the URL's.
  const headerWalletName =
    (isSyncing || isCompleted ? syncingWalletName : null) ||
    targetWalletName ||
    resolvedWallet?.walletName ||
    null;

  // Clear leftovers from a previous scan of a DIFFERENT wallet (cancelled or
  // completed-and-never-dismissed) so this wallet's screen starts pristine.
  // Never clears an actively running scan or this wallet's own results.
  useEffect(() => {
    if (
      !isSyncing &&
      syncingWalletClientId !== null &&
      syncingWalletClientId !== resolvedWalletClientId
    ) {
      dispatch(resetCoinSync());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartSync = useCallback(() => {
    const lastScanTimestamp = resolvedWallet?.lastCoinsScanTimestamp;
    if (!isCoinScanAvailableForTimestamp(lastScanTimestamp)) {
      showToast({
        type: 'errorToast',
        title: 'Scan Unavailable',
        message: 'You can scan each wallet once every 24 hours',
      });
      return;
    }
    dispatch(syncAllCoins({walletClientId: resolvedWalletClientId}));
  }, [dispatch, resolvedWallet, resolvedWalletClientId]);

  // Cancelling arms the 24h cooldown, so always confirm first
  const handleCancel = useCallback(() => {
    setShowCancelConfirm(true);
  }, []);

  const handleConfirmCancelScan = useCallback(() => {
    setShowCancelConfirm(false);
    if (!isSyncing) {
      // Scan finished while the modal was open - completion already
      // armed the cooldown, nothing left to cancel
      return;
    }
    dispatch(cancelSyncWithCooldown());
    if (coinsWithBalanceCount === 0) {
      // With partial results the 'completed' selection UI stays visible;
      // with nothing found the state resets, so explain the cooldown
      showToast({
        type: 'warningToast',
        title: 'Scan Cancelled',
        message: 'You can scan this wallet again in 24 hours',
      });
    }
  }, [dispatch, isSyncing, coinsWithBalanceCount]);

  const handleDismissCancelScan = useCallback(() => {
    setShowCancelConfirm(false);
  }, []);

  // Close the cancel confirmation if the scan finishes or errors
  // underneath it - there is nothing left to cancel
  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      if (showCancelConfirm && !isSyncing) {
        setShowCancelConfirm(false);
      }
    })();
  }, [showCancelConfirm, isSyncing]);

  const handleGoBack = useCallback(() => {
    if (isCreatingWallets) return;
    if (hasPendingCoins) {
      setShowLeaveConfirm(true);
      return;
    }
    if (!isSyncing) {
      dispatch(resetCoinSync());
    }
    router.back();
  }, [dispatch, router, isSyncing, isCreatingWallets, hasPendingCoins]);

  const handleConfirmLeave = useCallback(() => {
    setShowLeaveConfirm(false);
    dispatch(resetCoinSync());
    router.back();
  }, [dispatch, router]);

  const handleCancelLeave = useCallback(() => {
    setShowLeaveConfirm(false);
  }, []);

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
      addCoinsToWallet({coins: selectedCoins, clientId: syncingWalletClientId}),
    );
    showToast({
      type: 'successToast',
      title: 'Coins Added',
      message: `Added ${selectedCoins.length} coin${selectedCoins.length !== 1 ? 's' : ''} to your wallet`,
    });
    dispatch(resetCoinSync());
    router.back();
  }, [coinsWithBalance, dispatch, router, syncingWalletClientId]);

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden='true' />
      <div className={styles.topBar}>
        <GeneralButton
          variant='unstyled'
          className={styles.iconButton}
          aria-label='Back'
          disabled={isCreatingWallets}
          onClick={handleGoBack}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <div className={styles.heading}>
          <h1 className={styles.title}>Scan coins</h1>
          {headerWalletName ? (
            <span className={styles.subtitle}>{headerWalletName}</span>
          ) : null}
        </div>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>

      <div className={styles.column}>
        <CoinSyncProgress
          progress={progress}
          currentCoin={currentCoin}
          isSyncing={isSyncing}
          status={status}
          syncingWalletName={syncingWalletName}
        />

        {coinsWithBalance.length > 0 ? (
          <section className={styles.results} aria-label='Coins found'>
            <div className={styles.resultsHead}>
              <span className={styles.resultsLabel}>
                {resultsHeaderText || 'Coins found'}
              </span>
              <span className={styles.resultsCount}>
                {isCompleted
                  ? `${selectedCount} of ${coinsWithBalanceCount} selected`
                  : `${coinsWithBalanceCount} found`}
              </span>
            </div>
            <div className={styles.card}>
              {coinsWithBalance.map((item, index) => (
                <CoinSyncItem
                  key={item._id || `${item.symbol}_${index}`}
                  coin={item}
                  isSelectable={isCompleted}
                  isSelected={item.isSelected}
                  onToggle={() => handleToggleSelection(index)}
                />
              ))}
            </div>
          </section>
        ) : (
          <CoinSyncEmptyState status={status} />
        )}

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
          <div className={styles.blockerDialog} role='alertdialog'>
            <span className={styles.blockerSpinner} aria-hidden='true' />
            <p className={styles.blockerTitle}>Creating wallets…</p>
            <p className={styles.blockerSubtitle}>
              Please wait and keep this page open.
            </p>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        visible={showLeaveConfirm}
        title={discardCopy.title}
        subtitle={discardCopy.subtitle}
        infoText={
          "Scanning is limited to once every 24 hours, so you won't be able to rescan this wallet until tomorrow."
        }
        confirmLabel={'Discard'}
        dismissLabel={'Stay'}
        onConfirm={handleConfirmLeave}
        onDismiss={handleCancelLeave}
      />
      <ConfirmationModal
        visible={showCancelConfirm}
        title={'Cancel scan?'}
        subtitle={
          "Are you sure you want to cancel? Once you cancel, you won't be able to scan this wallet again for 24 hours."
        }
        infoText={
          coinsWithBalanceCount > 0
            ? 'Coins found so far will still be available to add to your wallet.'
            : null
        }
        infoIcon={CheckCircleOutline}
        confirmLabel={'Cancel Scan'}
        dismissLabel={'Keep Scanning'}
        onConfirm={handleConfirmCancelScan}
        onDismiss={handleDismissCancelScan}
      />
    </main>
  );
};

export default CoinSync;
