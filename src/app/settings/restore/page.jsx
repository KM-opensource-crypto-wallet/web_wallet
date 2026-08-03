'use client';
import React, {useState, useEffect, useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {selectAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {createWalletsBatch} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  fetchEncryptedBackup,
  decryptBackup,
  deleteWalletBackup,
  BACKUP_ERROR_CODES,
} from 'utils/googleDriveBackup';
import {showToast} from 'utils/toast';
import {useRouter} from 'next/navigation';
import s from './Restore.module.css';
import GoBackButton from 'components/GoBackButton';
import UserMenu from 'components/UserMenu';
import DriveGuideModal from 'components/DriveGuideModal';
import ModalBackupPassword from 'components/ModalBackupPassword';
import ModalDeleteBackup from 'components/ModalDeleteBackup';
import WalletSelectionCard from 'components/WalletSelectionCard';
import {useSession, signIn, signOut} from 'next-auth/react';
import {isBackupRestoreEnabled} from 'whitelabel/whiteLabelInfo';

const RestorePage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const existingWallets = useSelector(selectAllWallets);
  const {data: session, status} = useSession();

  const [restorableWallets, setRestorableWallets] = useState([]);
  const [selectedWalletIds, setSelectedWalletIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showDriveGuideModal, setShowDriveGuideModal] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [encryptedBackup, setEncryptedBackup] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [hasMounted, setHasMounted] = useState(false);

  // Mark as mounted to prevent hydration mismatch
  useEffect(() => {
    setHasMounted(true);
    if (!isBackupRestoreEnabled()) {
      router.replace('/settings');
    }
  }, [router]);

  const processBackupData = useCallback(data => {
    if (data && data.wallets && Array.isArray(data.wallets)) {
      const wallets = data.wallets.filter(w => w.phrase || w.privateKey);
      setRestorableWallets(wallets);
      setSelectedWalletIds(wallets.map(w => w.clientId));
    } else {
      setRestorableWallets([]);
      showToast({
        type: 'warningToast',
        title: 'No Data',
        message: 'No valid wallet backup found.',
      });
    }
  }, []);

  const handleLogin = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('skip_lock_screen', 'true');
    }
    const result = await signIn('google', {
      redirect: false,
      callbackUrl: window.location.href,
    });
    if (result?.url) {
      window.location.replace(result.url);
    }
  };

  const handleLogout = useCallback(async (shouldSignInAfter = false) => {
    await signOut({redirect: false});
    setRestorableWallets([]);
    setSelectedWalletIds([]);
    setError(null);
    setEncryptedBackup(null);
    setShowPasswordModal(false);
    setPasswordError('');
    if (shouldSignInAfter) {
      handleLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBackup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {encryptedData, needsPassword} = await fetchEncryptedBackup();

      if (needsPassword) {
        setEncryptedBackup(encryptedData);
        setPasswordError('');
        setShowPasswordModal(true);
      } else {
        processBackupData(await decryptBackup(encryptedData));
      }
    } catch (err) {
      console.error('Fetch Backup Error:', err);
      if (
        err?.message?.includes('insufficient authentication scopes') ||
        err?.message?.includes('Session expired')
      ) {
        showToast({
          type: 'errorToast',
          title: 'Download Failed',
          message: err?.message || 'Session expired. Please sign in again.',
        });
        handleLogout(true);
        return;
      }

      setError(err);
      showToast({
        type: 'errorToast',
        title: 'Download Failed',
        message: err?.message || 'Failed to download backup.',
      });
    } finally {
      setLoading(false);
    }
  }, [processBackupData, handleLogout]);

  useEffect(() => {
    if (hasMounted && status === 'authenticated' && session) {
      fetchBackup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, status]);

  const handleConnect = () => {
    setShowDriveGuideModal(true);
  };

  const handleDriveGuideContinue = () => {
    setShowDriveGuideModal(false);
    if (status === 'authenticated') {
      fetchBackup();
    } else {
      handleLogin();
    }
  };

  const handleDeleteBackup = useCallback(async () => {
    try {
      await deleteWalletBackup();
      setRestorableWallets([]);
      setSelectedWalletIds([]);
      setEncryptedBackup(null);
      setShowPasswordModal(false);
      setPasswordError('');
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

  const handleRetry = async () => {
    if (
      error?.code === BACKUP_ERROR_CODES.PASSWORD_REQUIRED &&
      encryptedBackup
    ) {
      setError(null);
      setPasswordError('');
      setShowPasswordModal(true);
      return;
    }
    handleLogout(true);
  };

  const handleRestorePasswordSuccess = async password => {
    try {
      const data = await decryptBackup(encryptedBackup, password);
      setShowPasswordModal(false);
      setPasswordError('');
      processBackupData(data);
    } catch (err) {
      if (err?.code === BACKUP_ERROR_CODES.WRONG_PASSWORD) {
        setPasswordError('Incorrect backup password. Please try again.');
        return;
      }
      setShowPasswordModal(false);
      setError(err);
      showToast({
        type: 'errorToast',
        title: 'Restore Failed',
        message: err?.message || 'Failed to decrypt backup.',
      });
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPasswordError('');
    setError({
      code: BACKUP_ERROR_CODES.PASSWORD_REQUIRED,
      message: 'A password is required to unlock this backup.',
    });
  };

  const isAllSelected =
    restorableWallets.length > 0 &&
    selectedWalletIds.length === restorableWallets.length;

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedWalletIds([]);
    } else {
      setSelectedWalletIds(restorableWallets.map(w => w.clientId));
    }
  }, [isAllSelected, restorableWallets]);

  const toggleSelect = useCallback(clientId => {
    setSelectedWalletIds(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      }
      return [...prev, clientId];
    });
  }, []);

  const handleRestorePress = async () => {
    if (selectedWalletIds.length === 0) return;

    setRestoring(true);
    let duplicateCount = 0;

    const walletsToRestore = [];
    const selectedWallets = restorableWallets.filter(w =>
      selectedWalletIds.includes(w.clientId),
    );

    for (const wallet of selectedWallets) {
      const isDuplicate = existingWallets.some(
        existing => existing.clientId === wallet.clientId,
      );

      if (isDuplicate) {
        duplicateCount++;
      } else {
        walletsToRestore.push({
          ...wallet,
          isFromBackup: true,
        });
      }
    }

    if (walletsToRestore.length > 0) {
      try {
        const result = await dispatch(
          createWalletsBatch(walletsToRestore),
        ).unwrap();
        const successCount = result?.newWallets?.length || 0;
        const failCount = result?.failedWallets?.length || 0;

        if (successCount > 0) {
          showToast({
            type: 'successToast',
            title: 'Restore Complete',
            message: `Restored ${successCount} wallets.`,
          });
          router.push('/settings');
        } else if (failCount > 0) {
          showToast({
            type: 'errorToast',
            title: 'Restore Issues',
            message: `Failed to restore ${failCount} wallets.`,
          });
        }
      } catch (err) {
        showToast({
          type: 'errorToast',
          title: 'Restore Failed',
          message: err.message || 'Batch restore process failed.',
        });
      }
    } else if (duplicateCount > 0) {
      showToast({
        type: 'warningToast',
        title: 'No New Wallets',
        message: 'All selected wallets already exist on this device.',
      });
    }

    setRestoring(false);
  };

  const isWalletRestored = wallet =>
    existingWallets.some(existing => existing.clientId === wallet.clientId);

  const renderContent = () => {
    if (!hasMounted) {
      return (
        <div className={`${s.container}`}>
          <p className={s.loadingText}>Loading...</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className={`${s.center}`}>
          <p className={s.loadingText}>
            {status === 'authenticated'
              ? 'Searching for backups...'
              : 'Loading...'}
          </p>
        </div>
      );
    }

    // Not Logged In
    if (status !== 'authenticated') {
      return (
        <div className={`${s.center}`}>
          <div className={s.emptyStateContainer}>
            <p className={`${s.text} ${s.emptyStateDescription}`}>
              Connect your Google Drive to restore wallet backups.
            </p>
            <button className={s.button} onClick={handleConnect}>
              <p className={s.buttonTitle}>Connect Google Drive</p>
            </button>
          </div>
        </div>
      );
    }

    // Logged In but Fetch Error (Retry State)
    if (error) {
      const isPasswordRequired =
        error?.code === BACKUP_ERROR_CODES.PASSWORD_REQUIRED;
      return (
        <div className={`${s.center}`}>
          <div className={s.emptyStateContainer}>
            <p
              className={`${s.text} ${s.emptyStateTitle}`}
              style={{color: 'red'}}>
              {isPasswordRequired
                ? 'Backup is password protected.'
                : 'Failed to fetch backups.'}
            </p>
            <p className={`${s.subTitle} ${s.emptyStateDescription}`}>
              {error.message ||
                'Please check your internet connection and permissions.'}
            </p>
            <button className={s.button} onClick={handleRetry}>
              <p className={s.buttonTitle}>
                {isPasswordRequired ? 'Enter Password' : 'Retry Login'}
              </p>
            </button>
          </div>
        </div>
      );
    }

    // Logged In, Success
    return (
      <>
        {restorableWallets.length > 0 && (
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
              {selectedWalletIds.length}/{restorableWallets.length} Selected
            </span>
          </div>
        )}

        {restorableWallets.length === 0 ? (
          <div className={`${s.container} ${s.center}`}>
            <p className={s.text}>No backups found in your Drive.</p>
          </div>
        ) : (
          <div className={s.walletSection}>
            {restorableWallets.map(wallet => (
              <WalletSelectionCard
                key={
                  wallet.clientId || `${wallet.walletName}-${wallet.chain_name}`
                }
                item={wallet}
                isSelected={selectedWalletIds.includes(wallet.clientId)}
                toggleSelect={toggleSelect}
                isRestored={isWalletRestored(wallet)}
              />
            ))}
          </div>
        )}

        <div className={s.footer}>
          <button
            className={`${s.button} ${
              restoring ||
              selectedWalletIds.length === 0 ||
              restorableWallets.length === 0
                ? s.buttonDisabled
                : ''
            }`}
            onClick={handleRestorePress}
            disabled={
              restoring ||
              selectedWalletIds.length === 0 ||
              restorableWallets.length === 0
            }>
            <p className={s.buttonTitle}>
              {restoring ? 'Restoring...' : 'Restore Selected'}
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
            <p className={s.screenTitle}>Restore Wallets</p>
            <p className={s.subTitle}>
              Recover your wallets from Google Drive.
            </p>
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

      <DriveGuideModal
        visible={showDriveGuideModal}
        onContinue={handleDriveGuideContinue}
      />

      <ModalBackupPassword
        visible={showPasswordModal}
        mode='enter'
        errorText={passwordError}
        hideModal={handlePasswordCancel}
        onSuccess={handleRestorePasswordSuccess}
      />

      <ModalDeleteBackup
        visible={showDeleteModal}
        hideModal={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteBackup}
      />
    </div>
  );
};

export default RestorePage;
