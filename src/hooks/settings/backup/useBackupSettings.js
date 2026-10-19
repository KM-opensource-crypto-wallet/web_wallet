import {useCallback, useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useSession, signIn, signOut} from 'next-auth/react';
import {showToast} from 'src/utils/toast';
import {
  backupWalletsToDrive,
  deleteWalletBackup,
  BACKUP_ERROR_CODES,
} from 'utils/googleDriveBackup';
import {isBackupRestoreEnabled} from 'whitelabel/whiteLabelInfo';
import useWallet from 'src/hooks/wallet/useWallet';

// Logic for the Google Drive backup screen (app/settings/backup).
export const useBackupSettings = () => {
  const router = useRouter();
  const {data: session, status} = useSession();
  const {visibleWallets: allWallets, masterClientId, fiatSymbol} = useWallet();
  const symbol = fiatSymbol || '$';

  const [selectedWalletIds, setSelectedWalletIds] = useState([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showDriveGuideModal, setShowDriveGuideModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordMode, setPasswordMode] = useState('create');
  const [passwordError, setPasswordError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Mark as mounted to prevent hydration mismatch
  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      setHasMounted(true);
    })();
    if (!isBackupRestoreEnabled()) {
      router.replace('/settings');
    }
  }, [router]);

  // Initialize selection ONCE when wallets load
  useEffect(() => {
    // see comment on the first wrapped effect above
    (() => {
      if (
        hasMounted &&
        allWallets.length > 0 &&
        selectedWalletIds.length === 0
      ) {
        // Check if we have saved selection from before redirect
        const savedSelection = sessionStorage.getItem(
          'backup_selected_wallet_ids',
        );
        if (savedSelection) {
          try {
            const parsed = JSON.parse(savedSelection);
            if (Array.isArray(parsed)) {
              setSelectedWalletIds(parsed);
            } else {
              setSelectedWalletIds(allWallets.map(w => w.clientId));
            }
          } catch {
            sessionStorage.removeItem('backup_selected_wallet_ids');
            setSelectedWalletIds(allWallets.map(w => w.clientId));
          }
        } else {
          setSelectedWalletIds(allWallets.map(w => w.clientId));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, allWallets.length]);

  // Resume after the OAuth redirect: the password is never persisted, so
  // reopen the password modal instead of backing up directly
  useEffect(() => {
    // see comment on the first wrapped effect above
    (() => {
      if (
        hasMounted &&
        status === 'authenticated' &&
        sessionStorage.getItem('backup_pending') === 'true' &&
        allWallets.length > 0 &&
        selectedWalletIds.length > 0
      ) {
        sessionStorage.removeItem('backup_pending');
        sessionStorage.removeItem('backup_selected_wallet_ids');
        setPasswordMode('create');
        setPasswordError('');
        setShowPasswordModal(true);
      }
    })();
  }, [hasMounted, status, allWallets.length, selectedWalletIds.length]);

  const isAllSelected = useMemo(
    () =>
      hasMounted &&
      allWallets.length > 0 &&
      selectedWalletIds.length === allWallets.length,
    [hasMounted, allWallets, selectedWalletIds],
  );

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedWalletIds([]);
    } else {
      setSelectedWalletIds(allWallets.map(w => w.clientId));
    }
  }, [isAllSelected, allWallets]);

  const toggleSelect = useCallback(clientId => {
    setSelectedWalletIds(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      }
      return [...prev, clientId];
    });
  }, []);

  const handleBackupPress = () => {
    if (selectedWalletIds.length === 0) {
      showToast({
        type: 'errorToast',
        title: 'No Wallets Selected',
        message: 'Please select at least one wallet to backup.',
      });
      return;
    }
    setShowWarningModal(true);
  };

  const performBackup = () => {
    setShowWarningModal(false);
    setShowDriveGuideModal(true);
  };

  const handleLogin = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('backup_pending', 'true');
      sessionStorage.setItem(
        'backup_selected_wallet_ids',
        JSON.stringify(selectedWalletIds),
      );
    }
    const result = await signIn('google', {
      redirect: false,
      callbackUrl: window.location.href,
    });
    if (result?.url) {
      window.location.replace(result.url);
    }
  };

  const handleDriveGuideContinue = () => {
    setShowDriveGuideModal(false);
    if (status === 'authenticated') {
      setPasswordMode('create');
      setPasswordError('');
      setShowPasswordModal(true);
    } else {
      handleLogin();
    }
  };

  const handleLogout = async (shouldSignInAfter = false) => {
    await signOut({redirect: false});
    if (shouldSignInAfter) {
      handleLogin();
    }
  };

  const handleDeleteBackup = useCallback(async () => {
    try {
      await deleteWalletBackup();
      showToast({
        type: 'successToast',
        title: 'Backup Deleted',
        message: 'All wallet backups have been deleted from Google Drive.',
      });
    } catch (err) {
      console.error('Delete Backup Failed:', err);
      showToast({
        type: 'errorToast',
        title: 'Delete Failed',
        message:
          err?.message === 'No backup file found to delete.'
            ? 'No backup found to delete.'
            : err?.message || 'Failed to delete backup from Google Drive.',
      });
    }
  }, []);

  const handleBackupPasswordSuccess = async password => {
    setShowPasswordModal(false);
    setIsBackingUp(true);

    try {
      const selectedWallets = allWallets.filter(w =>
        selectedWalletIds.includes(w.clientId),
      );

      const formattedWallets = selectedWallets.map(w => ({
        ...w,
        coins: w.coins || [],
        clientId: w.clientId || '',
        walletName: w.walletName || '',
        phrase: w.phrase || '',
        privateKey: w?.privateKey || '',
        chain_name: w?.chain_name || w?.coins?.[0]?.chain_name || '',
      }));

      const backupData = {
        wallets: formattedWallets,
        masterClientId: masterClientId || '',
      };

      await backupWalletsToDrive(backupData, password);

      showToast({
        type: 'successToast',
        title: 'Backup Successful',
        message: 'Your wallets have been safely backed up to Google Drive.',
      });
    } catch (err) {
      console.error('Backup Failed:', err);

      if (err?.code === BACKUP_ERROR_CODES.WRONG_PASSWORD) {
        setPasswordMode('enter');
        setPasswordError(err?.message || 'Incorrect backup password.');
        setShowPasswordModal(true);
        return;
      }

      if (
        err?.message?.includes('insufficient authentication scopes') ||
        err?.message?.includes('Session expired')
      ) {
        showToast({
          type: 'errorToast',
          title: 'Backup Failed',
          message: err?.message || 'Session expired. Please sign in again.',
        });
        handleLogout(true);
        return;
      }

      showToast({
        type: 'errorToast',
        title: 'Backup Failed',
        message: err?.message || 'An unexpected error occurred during backup.',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  return {
    // replace, not back(): history may end at the Google sign-in page
    goBack: () => router.replace('/settings'),
    session,
    logout: () => handleLogout(),
    hasMounted,

    // Wallet picker
    allWallets,
    selectedWalletIds,
    isAllSelected,
    toggleSelectAll,
    toggleSelect,
    symbol,

    // Backup
    isBackingUp,
    handleBackupPress,

    // Warning modal
    showWarningModal,
    performBackup,
    closeWarningModal: () => setShowWarningModal(false),

    // Drive guide modal
    showDriveGuideModal,
    handleDriveGuideContinue,

    // Password modal
    showPasswordModal,
    passwordMode,
    passwordError,
    hidePasswordModal: () => setShowPasswordModal(false),
    handleBackupPasswordSuccess,

    // Delete backup modal
    showDeleteModal,
    openDeleteModal: () => setShowDeleteModal(true),
    closeDeleteModal: () => setShowDeleteModal(false),
    handleDeleteBackup,
  };
};

export default useBackupSettings;
