'use client';
import React from 'react';
import s from './Backup.module.css';
import GeneralButton from 'components/Button';
import Screen from 'components/Screen';
import {CloudUpIcon} from '../SettingsIcons';
import WalletPicker from './WalletPicker';
import UserMenu from 'components/UserMenu';
import ModalConfirm from 'components/ModalConfirm';
import DriveGuideModal from 'components/DriveGuideModal';
import ModalBackupPassword from 'components/ModalBackupPassword';
import ModalDeleteBackup from 'components/ModalDeleteBackup';
import useBackupSettings from 'src/hooks/settings/backup/useBackupSettings';

const BackupPage = () => {
  const {
    goBack,
    session,
    logout,
    hasMounted,
    allWallets,
    selectedWalletIds,
    isAllSelected,
    toggleSelectAll,
    toggleSelect,
    symbol,
    isBackingUp,
    handleBackupPress,
    showWarningModal,
    performBackup,
    closeWarningModal,
    showDriveGuideModal,
    handleDriveGuideContinue,
    showPasswordModal,
    passwordMode,
    passwordError,
    hidePasswordModal,
    handleBackupPasswordSuccess,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteBackup,
  } = useBackupSettings();

  const renderContent = () => {
    if (!hasMounted) {
      return (
        <div className={s.status} role='status'>
          <span className={s.spinner} aria-hidden='true' />
          Loading...
        </div>
      );
    }

    return (
      <>
        {allWallets.length > 0 ? (
          <WalletPicker
            label='Wallets to back up'
            wallets={allWallets}
            selectedWalletIds={selectedWalletIds}
            isAllSelected={isAllSelected}
            toggleSelectAll={toggleSelectAll}
            toggleSelect={toggleSelect}
            currencySymbol={symbol}
          />
        ) : (
          <p className={s.empty}>No wallets to back up.</p>
        )}

        <div className={s.footer}>
          <GeneralButton
            fullWidth
            loading={isBackingUp}
            loadingLabel='Backing up...'
            disabled={selectedWalletIds.length === 0}
            onClick={handleBackupPress}>
            Backup Selected
          </GeneralButton>
        </div>
      </>
    );
  };

  return (
    <Screen
      className={s.page}
      title='Backup Wallets'
      // replace, not back(): history may end at the Google sign-in page
      onBack={goBack}
      right={
        session &&
        session.user && (
          <span className={s.account}>
            <UserMenu
              user={session.user}
              onLogout={logout}
              onDeleteBackup={openDeleteModal}
            />
          </span>
        )
      }>
      <div className={s.column}>
        <section className={s.intro}>
          <span className={s.introIcon} aria-hidden='true'>
            <CloudUpIcon size={22} />
          </span>
          <div className={s.introText}>
            <h2 className={s.introTitle}>Google Drive backup</h2>
            <p className={s.introBody}>
              Select the wallets you want to secure.
            </p>
          </div>
        </section>

        {renderContent()}
      </div>

      <ModalConfirm
        visible={showWarningModal}
        title='Backup Warning'
        description='This is not a foolproof backup. You are responsible for keeping your recovery phrase safe. Google Drive backup is for convenience only.'
        yesButtonTitle='I Understand'
        noButtonTitle='Cancel'
        onPressYes={performBackup}
        onPressNo={closeWarningModal}
      />

      <DriveGuideModal
        visible={showDriveGuideModal}
        onContinue={handleDriveGuideContinue}
      />

      <ModalBackupPassword
        visible={showPasswordModal}
        mode={passwordMode}
        errorText={passwordError}
        hideModal={hidePasswordModal}
        onSuccess={handleBackupPasswordSuccess}
      />

      <ModalDeleteBackup
        visible={showDeleteModal}
        hideModal={closeDeleteModal}
        onConfirm={handleDeleteBackup}
      />
    </Screen>
  );
};

export default BackupPage;
