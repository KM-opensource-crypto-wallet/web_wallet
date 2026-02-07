'use client';
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from 'react';
import {useSelector} from 'react-redux';
import {
  selectAllWallets,
  getMasterClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {backupWalletsToDrive} from 'utils/googleDriveBackup';
import {showToast} from 'utils/toast';
import s from './Backup.module.css';
import Image from 'next/image';
import {getAppIcon} from 'whitelabel/whiteLabelInfo';
import {ThemeContext} from 'theme/ThemeContext';
import GoBackButton from 'components/GoBackButton';
import UserMenu from 'components/UserMenu';
import {useSession, signIn, signOut} from 'next-auth/react';
import {useRouter} from 'next/navigation';
import {isBackupRestoreEnabled} from 'whitelabel/whiteLabelInfo';

const BackupPage = () => {
  const router = useRouter();
  const {data: session, status, update: updateSession} = useSession();
  const allWallets = useSelector(selectAllWallets);
  const masterClientId = useSelector(getMasterClientId);
  const {themeType} = useContext(ThemeContext);

  const [selectedWalletIds, setSelectedWalletIds] = useState([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showDriveGuideModal, setShowDriveGuideModal] = useState(false);
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
        setSelectedWalletIds(JSON.parse(savedSelection));
      } else {
        setSelectedWalletIds(allWallets.map(w => w.clientId));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, allWallets.length]);

  // Handle automatic backup trigger after redirect
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
      startBackupProcess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, status, allWallets.length, selectedWalletIds.length]);

  const isAllSelected =
    hasMounted &&
    allWallets.length > 0 &&
    selectedWalletIds.length === allWallets.length;

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
        type: 'error',
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
      startBackupProcess();
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

  const startBackupProcess = async () => {
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

      await backupWalletsToDrive(backupData);

      showToast({
        type: 'success',
        message: 'Your wallets have been safely backed up to Google Drive.',
      });
    } catch (err) {
      console.error('Backup Failed:', err);

      if (
        err?.message?.includes('insufficient authentication scopes') ||
        err?.message?.includes('Session expired')
      ) {
        showToast({
          type: 'error',
          message: err?.message || 'Session expired. Please sign in again.',
        });
        handleLogout(true);
        return;
      }

      showToast({
        type: 'error',
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
          {allWallets.map(wallet => {
            const isSelected = selectedWalletIds.includes(wallet.clientId);
            return (
              <div key={wallet.clientId} className={s.walletBox}>
                <label className={s.walletList} style={{cursor: 'pointer'}}>
                  <div className={s.checkboxContainer}>
                    <input
                      type='checkbox'
                      className={s.checkbox}
                      checked={isSelected}
                      onChange={() => toggleSelect(wallet.clientId)}
                    />
                  </div>

                  <div className={s.avatarWrapper}>
                    <Image
                      className={s.avatarAvatar}
                      alt='avatar'
                      width={54}
                      height={54}
                      src={getAppIcon()}
                    />
                  </div>

                  <div className={s.textContainer}>
                    <p className={s.mainText}>{wallet.walletName}</p>
                    <p className={s.secondaryText}>
                      {wallet?.isImportWalletWithPrivateKey
                        ? `${wallet?.coins?.[0]?.chain_display_name || ''} Wallet`
                        : 'Multi - Coin Wallet'}
                    </p>
                  </div>
                </label>
              </div>
            );
          })}
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
          <UserMenu user={session.user} onLogout={() => handleLogout()} />
        )}
      </div>

      {renderContent()}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className={s.modalOverlay}>
          <div className={s.modalContent}>
            <h2 className={s.modalTitle}>Backup Warning</h2>
            <p className={s.modalDescription}>
              This is not a foolproof backup. You are responsible for keeping
              your recovery phrase safe. Google Drive backup is for convenience
              only.
            </p>
            <div className={s.modalButtons}>
              <button
                className={s.modalButtonSecondary}
                onClick={() => setShowWarningModal(false)}>
                Cancel
              </button>
              <button className={s.modalButtonPrimary} onClick={performBackup}>
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drive Guide Modal */}
      {showDriveGuideModal && (
        <div className={s.modalOverlay}>
          <div className={s.modalContent}>
            <h2 className={s.modalTitle}>Authentication Required</h2>
            <p className={s.modalDescription}>
              You need to sign in with Google to perform the backup.
            </p>
            <button
              className={s.modalButtonPrimary}
              onClick={handleDriveGuideContinue}>
              {status === 'authenticated' ? 'Continue' : 'Sign in with Google'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupPage;
