'use client';
import React, {useState, useEffect, useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {selectAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {createWalletsBatch} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {restoreWalletsFromDrive} from 'utils/googleDriveBackup';
import {showToast} from 'utils/toast';
import {useRouter} from 'next/navigation';
import s from './Restore.module.css';
import Image from 'next/image';
import {getAppIcon} from 'whitelabel/whiteLabelInfo';
import GoBackButton from 'components/GoBackButton';
import UserMenu from 'components/UserMenu';
import {useSession, signIn, signOut} from 'next-auth/react';

const RestorePage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const existingWallets = useSelector(selectAllWallets);
  const {data: session, status, update: updateSession} = useSession();

  const [restorableWallets, setRestorableWallets] = useState([]);
  const [selectedWalletIds, setSelectedWalletIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showDriveGuideModal, setShowDriveGuideModal] = useState(false);
  const [error, setError] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Mark as mounted to prevent hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchBackup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  const handleConnect = () => {
    setShowDriveGuideModal(true);
  };

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

  const handleDriveGuideContinue = () => {
    setShowDriveGuideModal(false);
    if (status === 'authenticated') {
      fetchBackup();
    } else {
      handleLogin();
    }
  };

  const handleLogout = async (shouldSignInAfter = false) => {
    await signOut({redirect: false});
    setRestorableWallets([]);
    setError(null);
    if (shouldSignInAfter) {
      handleLogin();
    }
  };

  const handleRetry = async () => {
    handleLogout(true);
  };

  const fetchBackup = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await restoreWalletsFromDrive();

      if (data && data.wallets && Array.isArray(data.wallets)) {
        const wallets = data.wallets.filter(w => w.phrase || w.privateKey);
        setRestorableWallets(wallets);
        setSelectedWalletIds(wallets.map(w => w.clientId));
      } else {
        setRestorableWallets([]);
        showToast({
          type: 'warning',
          message: 'No valid wallet found.',
        });
      }
    } catch (err) {
      console.error('Fetch Backup Error:', err);
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

      setError(err);
      showToast({
        type: 'error',
        message: err?.message || 'Failed to download backup.',
      });
    } finally {
      setLoading(false);
    }
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
            type: 'success',
            message: `Restored ${successCount} wallets.`,
          });
          router.push('/settings');
        } else if (failCount > 0) {
          showToast({
            type: 'error',
            message: `Failed to restore ${failCount} wallets.`,
          });
        }
      } catch (err) {
        showToast({
          type: 'error',
          message: err.message || 'Batch restore process failed.',
        });
      }
    } else if (duplicateCount > 0) {
      showToast({
        type: 'warning',
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
          <p className={s.loadingText}>Loading...</p>
        </div>
      );
    }

    // Not Logged In
    if (status !== 'authenticated') {
      return (
        <div className={`${s.center}`}>
          <div className={s.emptyStateContainer}>
            <p className={`${s.text} ${s.emptyStateDescription}`}>
              Connect your Google Drive to restore wallets.
            </p>
            <button className={s.button} onClick={handleConnect}>
              <p className={s.buttonTitle}>Connect with Google</p>
            </button>
          </div>

          {showDriveGuideModal && (
            <div className={s.modalOverlay}>
              <div className={s.modalContent}>
                <h2 className={s.modalTitle}>Authentication Required</h2>
                <p className={s.modalDescription}>
                  You need to sign in with Google to perform the restore.
                </p>
                <button
                  className={s.modalButtonPrimary}
                  onClick={handleDriveGuideContinue}>
                  Sign in with Google
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Logged In but Fetch Error (Retry State)
    if (error) {
      return (
        <div className={`${s.center}`}>
          <div className={s.emptyStateContainer}>
            <p
              className={`${s.text} ${s.emptyStateTitle}`}
              style={{color: 'red'}}>
              Failed to fetch wallets.
            </p>
            <p className={`${s.subTitle} ${s.emptyStateDescription}`}>
              {error.message ||
                'Please check your internet connection and permissions.'}
            </p>
            <button className={s.button} onClick={handleRetry}>
              <p className={s.buttonTitle}>Retry Login</p>
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
            <p className={s.text}>No wallets found in your Drive.</p>
          </div>
        ) : (
          <div className={s.walletSection}>
            {restorableWallets.map(wallet => {
              const isRestored = isWalletRestored(wallet);
              return (
                <div
                  key={wallet.clientId || wallet.walletName}
                  className={s.walletBox}>
                  <label
                    className={s.walletList}
                    style={{
                      cursor: isRestored ? 'not-allowed' : 'pointer',
                      opacity: isRestored ? 0.6 : 1,
                    }}>
                    {!isRestored ? (
                      <div className={s.checkboxContainer}>
                        <input
                          type='checkbox'
                          className={s.checkbox}
                          checked={selectedWalletIds.includes(wallet.clientId)}
                          onChange={() => toggleSelect(wallet.clientId)}
                        />
                      </div>
                    ) : (
                      <div className={s.checkboxContainer}>
                        <div className={s.restoredPill}>
                          <span className={s.restoredText}>Restored</span>
                        </div>
                      </div>
                    )}

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
              {' '}
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
          <UserMenu user={session.user} onLogout={() => handleLogout()} />
        )}
      </div>
      {renderContent()}
    </div>
  );
};

export default RestorePage;
