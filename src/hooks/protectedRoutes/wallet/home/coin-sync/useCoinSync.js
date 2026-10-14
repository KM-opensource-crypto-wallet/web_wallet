import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';
import {useParams, useRouter} from 'next/navigation';
import {
  syncAllCoins,
  cancelSyncWithCooldown,
  resetCoinSync,
  toggleCoinSelection,
} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSlice';
import {addCoinsToWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {isCoinScanAvailableForTimestamp} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {showToast} from 'src/utils/toast';
import useWallet from 'src/hooks/wallet/useWallet';

// Logic for the Scan coins (coin sync) screen.
export const useCoinSync = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  // Wallet to scan - always the wallet named in the URL (may not be the
  // currently active wallet, e.g. scanning another wallet from its Edit screen)
  const {clientId: resolvedWalletClientId} = useParams();

  const {
    coinSyncStatus: status,
    coinSyncProgress: progress,
    currentSyncingCoin: currentCoin,
    coinsWithBalance,
    coinsWithBalanceCount,
    isCreatingWallets,
    isSyncing,
    selectedCount,
    syncingWalletClientId,
    syncingWalletName,
    allWallets,
    currentWalletClientId,
  } = useWallet();

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

  return {
    // Top bar
    handleGoBack,
    isCreatingWallets,
    headerWalletName,

    // Progress and results
    progress,
    currentCoin,
    isSyncing,
    status,
    syncingWalletName,
    coinsWithBalance,
    coinsWithBalanceCount,
    selectedCount,
    isCompleted,
    resultsHeaderText,
    handleToggleSelection,

    // Actions
    handleStartSync,
    handleCancel,
    handleAddSelectedCoins,

    // Leave confirmation
    showLeaveConfirm,
    discardCopy,
    handleConfirmLeave,
    handleCancelLeave,

    // Cancel-scan confirmation
    showCancelConfirm,
    handleConfirmCancelScan,
    handleDismissCancelScan,
  };
};

export default useCoinSync;
