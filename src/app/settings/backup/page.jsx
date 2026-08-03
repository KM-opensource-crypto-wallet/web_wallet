'use client';
import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {useSelector} from 'react-redux';
import {
  selectVisibleWallets,
  getMasterClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {currencySymbol} from 'data/currency';
import {
  backupWalletsToDrive,
  deleteWalletBackup,
  BACKUP_ERROR_CODES,
} from 'utils/googleDriveBackup';
import {showToast} from 'utils/toast';
import s from './Backup.module.css';
import GoBackButton from 'components/GoBackButton';
import UserMenu from 'components/UserMenu';
import ModalConfirm from 'components/ModalConfirm';
import DriveGuideModal from 'components/DriveGuideModal';
import ModalBackupPassword from 'components/ModalBackupPassword';
import ModalDeleteBackup from 'components/ModalDeleteBackup';
import WalletSelectionCard from 'components/WalletSelectionCard';
import {useSession, signIn, signOut} from 'next-auth/react';
import {useRouter} from 'next/navigation';
import {isBackupRestoreEnabled} from 'whitelabel/whiteLabelInfo';

const BackupPage = () => {
  const router = useRouter();
  const {data: session, status} = useSession();
  const allWallets = useSelector(selectVisibleWallets);
  const masterClientId = useSelector(getMasterClientId);
  const localCurrency = useSelector(getLocalCurrency);
  const symbol = currencySymbol[localCurrency] || '$';

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
    setHasMounted(true);
    if (!isBackupRestoreEnabled()) {
      router.replace('/settings');
    }
  }, [router]);

  // Initialize selection ONCE when wallets load
  useEffect(() => {
    if (hasMounted && allWallets.length > 0 && selectedWalletIds.length === 0) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, allWallets.length]);

  // Resume after the OAuth redirect: the password is never persisted, so
  // reopen the password modal instead of backing up directly
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      sessionStorage.setItem('skip_lock_screen', 'true');
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

  const renderContent = () => {
    if (!hasMounted) {
      return (
        <div className={`${s.container}`}>
          <p className={s.loadingText}>Loading...</p>
        </div>
      );
    }

    return (
      <>
        <div className={s.selectAllRow}>
          <button onClick={toggleSelectAll} className={s.selectAllButton}>
            <input
              type='checkbox'
              checked={isAllSelected}
              readOnly
              className={s.checkbox}
              style={{marginRight: '0'}}
            />
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </button>
          <span className={s.selectionCount}>
            {selectedWalletIds.length}/{allWallets.length} Selected
          </span>
        </div>

        <div className={s.walletSection}>
          {allWallets.map(wallet => (
            <WalletSelectionCard
              key={wallet.clientId}
              item={wallet}
              isSelected={selectedWalletIds.includes(wallet.clientId)}
              toggleSelect={toggleSelect}
              currencySymbol={symbol}
            />
          ))}
        </div>

        <div className={s.footer}>
          <button
            className={`${s.button} ${
              selectedWalletIds.length === 0 || isBackingUp
                ? s.buttonDisabled
                : ''
            }`}
            onClick={handleBackupPress}
            disabled={isBackingUp || selectedWalletIds.length === 0}>
            <p className={s.buttonTitle}>
              {isBackingUp ? 'Backing up...' : 'Backup Selected'}
            </p>
          </button>
        </div>
      </>
    );
  };

  return (
    <div className={s.container}>
      <div className={s.headerContainer}>
        <div className={s.headerLeft}>
          <GoBackButton onBack={() => router.replace('/settings')} />
          <div className={s.headerTitleRow}>
            <p className={s.screenTitle}>Backup Wallets</p>
            <p className={s.subTitle}>Select the wallets you want to secure.</p>
          </div>
        </div>
        {session && session.user && (
          <UserMenu
            user={session.user}
            onLogout={() => handleLogout()}
            onDeleteBackup={() => setShowDeleteModal(true)}
          />
        )}
      </div>

      {renderContent()}

      <ModalConfirm
        visible={showWarningModal}
        title='Backup Warning'
        description='This is not a foolproof backup. You are responsible for keeping your recovery phrase safe. Google Drive backup is for convenience only.'
        yesButtonTitle='I Understand'
        noButtonTitle='Cancel'
        onPressYes={performBackup}
        onPressNo={() => setShowWarningModal(false)}
      />

      <DriveGuideModal
        visible={showDriveGuideModal}
        onContinue={handleDriveGuideContinue}
      />

      <ModalBackupPassword
        visible={showPasswordModal}
        mode={passwordMode}
        errorText={passwordError}
        hideModal={() => setShowPasswordModal(false)}
        onSuccess={handleBackupPasswordSuccess}
      />

      <ModalDeleteBackup
        visible={showDeleteModal}
        hideModal={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteBackup}
      />
    </div>
  );
};

export default BackupPage;
