import {useCallback, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useDispatch} from 'react-redux';
import {toast} from 'react-toastify';
import * as Yup from 'yup';
import {walletRoutes} from 'utils/routes';
import {
  deleteWallet,
  updateWalletName,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import useCoinScanCooldown from 'src/hooks/useCoinScanCooldown';
import useWallet from 'src/hooks/wallet/useWallet';

// Wallet settings (rename, backups, hide, scan) for `?walletName=`.
export const useUpdateWallet = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const walletName = searchParams.get('walletName');
  const walletClientId = searchParams.get('walletClientId');

  const {
    currentWallet,
    currentWalletClientId,
    allWalletName,
    allWallets,
    isSyncing: isCoinSyncRunning,
    syncingWalletClientId,
    syncingWalletName,
  } = useWallet();
  // The other wallets' names, captured once at mount (the schema below is
  // rebuilt every render, so this must not be a ref read during render).
  const [finalAllWallets] = useState(() =>
    allWalletName.filter(subItem => subItem !== walletName),
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wrong, setWrong] = useState(false);
  const isCurrentWallet = walletName === currentWallet?.walletName;
  const canDelete = !isCurrentWallet && !!walletName;

  // The wallet being edited (only reachable while it's visible), as opposed to
  // `currentWallet` which is the globally active wallet.
  const editingWallet =
    allWallets.find(item => item?.clientId === walletClientId) || null;

  // Coin scan (1 per 24h per wallet) targets the wallet being edited
  const scanTargetClientId = walletClientId ?? currentWalletClientId;
  const scanWallet = editingWallet ?? currentWallet;
  const {isAvailable: isScanAvailable, remainingLabel: scanRemainingLabel} =
    useCoinScanCooldown(scanWallet?.lastCoinsScanTimestamp);
  const isScanningThisWallet =
    isCoinSyncRunning && syncingWalletClientId === scanTargetClientId;
  // Only one scan can run at a time - lock the row while another wallet scans
  const isScanningOtherWallet = isCoinSyncRunning && !isScanningThisWallet;
  const isScanRowEnabled =
    isScanningThisWallet || (isScanAvailable && !isScanningOtherWallet);
  const scanStatusLabel = isScanningThisWallet
    ? 'Scanning in progress — tap to view'
    : isScanningOtherWallet
      ? syncingWalletName
        ? `Scanning "${syncingWalletName}"…`
        : 'Another wallet is being scanned…'
      : isScanAvailable
        ? 'Discover assets across 200+ coins'
        : `Available in ${scanRemainingLabel}`;

  const validateNewWalletName = value => {
    if (currentWallet?.walletName !== value) {
      setWrong(
        allWallets.some(
          (item, index) =>
            item.walletName === value && index !== currentWallet.id,
        ),
      );
    }
  };

  const openDeleteModal = useCallback(() => setShowDeleteModal(true), []);

  const onPressYes = useCallback(() => {
    setShowDeleteModal(false);
    router.push(walletRoutes.home(currentWalletClientId));
    setTimeout(() => {
      if (walletClientId) {
        dispatch(deleteWallet(walletClientId));
      }
    }, 1000);
  }, [dispatch, router, walletClientId, currentWalletClientId]);

  const onPressNo = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const handleSubmit = values => {
    const toastId = toast.loading('Updating Wallet', {autoClose: false});
    setIsSubmitting(true);
    setTimeout(() => {
      try {
        dispatch(
          updateWalletName({
            clientId: walletClientId ?? currentWalletClientId,
            walletName: values.name,
          }),
        );
        router.back();
        setIsSubmitting(false);
        toast.dismiss(toastId);
        toast.success('Wallet updated successfully');
      } catch (e) {
        setIsSubmitting(false);
        toast.dismiss(toastId);
        toast.error('Something went wrong');
        console.error('error in update wallet', e);
      }
    }, 300);
  };

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .required('* Name cannot be empty')
      .notOneOf(finalAllWallets, 'The name of wallet already existed'),
  });

  const goToManualBackup = () =>
    router.push(walletRoutes.verifyCreate(walletClientId));
  const goToHideWallet = () =>
    router.push(walletRoutes.hideWallet(walletClientId));
  const goToCoinSync = () =>
    router.push(walletRoutes.coinSync(scanTargetClientId));

  return {
    walletName,
    initialValues: {name: walletName || ''},
    validationSchema,
    handleSubmit,
    isSubmitting,
    wrong,
    validateNewWalletName,
    canDelete,
    showDeleteModal,
    openDeleteModal,
    onPressYes,
    onPressNo,
    isHidden: !!editingWallet?.hideSettings,
    isScanAvailable,
    isScanningThisWallet,
    isScanningOtherWallet,
    isScanRowEnabled,
    scanStatusLabel,
    goToManualBackup,
    goToHideWallet,
    goToCoinSync,
  };
};

export default useUpdateWallet;
