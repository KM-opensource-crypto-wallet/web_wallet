'use client';
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
  useRef,
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

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

  // Stores the element that triggered each modal so focus can be restored on close
  const warningTriggerRef = useRef(null);
  const driveTriggerRef = useRef(null);
  // Refs to modal content divs for focus trapping
  const warningModalRef = useRef(null);
  const driveModalRef = useRef(null);

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

  // Focus trap and Escape handler for warning modal
  useEffect(() => {
    if (!showWarningModal) return;
    const modal = warningModalRef.current;
    const focusable = modal?.querySelectorAll(FOCUSABLE_SELECTORS);
    if (focusable?.length) focusable[0].focus();

    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        setShowWarningModal(false);
        warningTriggerRef.current?.focus();
        return;
      }
      if (e.key === 'Tab' && modal) {
        const all = Array.from(modal.querySelectorAll(FOCUSABLE_SELECTORS));
        const first = all[0];
        const last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showWarningModal]);

  // Focus trap and Escape handler for drive guide modal
  useEffect(() => {
    if (!showDriveGuideModal) return;
    const modal = driveModalRef.current;
    const focusable = modal?.querySelectorAll(FOCUSABLE_SELECTORS);
    if (focusable?.length) focusable[0].focus();

    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        setShowDriveGuideModal(false);
        driveTriggerRef.current?.focus();
        return;
      }
      if (e.key === 'Tab' && modal) {
        const all = Array.from(modal.querySelectorAll(FOCUSABLE_SELECTORS));
        const first = all[0];
        const last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDriveGuideModal]);

  const handleBackupPress = () => {
    if (selectedWalletIds.length === 0) {
      showToast({
        type: 'error',
        message: 'Please select at least one wallet to backup.',
      });
      return;
    }
    warningTriggerRef.current = document.activeElement;
    setShowWarningModal(true);
  };

  const performBackup = () => {
    // Drive modal inherits the same trigger so Escape/close restores focus correctly
    driveTriggerRef.current = warningTriggerRef.current;
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
    driveTriggerRef.current?.focus();
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
          <div
            className={s.modalContent}
            ref={warningModalRef}
            role='dialog'
            aria-modal='true'
            aria-labelledby='warning-modal-title'>
            <h2 id='warning-modal-title' className={s.modalTitle}>
              Backup Warning
            </h2>
            <p className={s.modalDescription}>
              This is not a foolproof backup. You are responsible for keeping
              your recovery phrase safe. Google Drive backup is for convenience
              only.
            </p>
            <div className={s.modalButtons}>
              <button
                className={s.modalButtonSecondary}
                onClick={() => {
                  setShowWarningModal(false);
                  warningTriggerRef.current?.focus();
                }}>
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
          <div
            className={s.modalContent}
            ref={driveModalRef}
            role='dialog'
            aria-modal='true'
            aria-labelledby='drive-guide-modal-title'>
            <h2 id='drive-guide-modal-title' className={s.modalTitle}>
              Authentication Required
            </h2>
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
