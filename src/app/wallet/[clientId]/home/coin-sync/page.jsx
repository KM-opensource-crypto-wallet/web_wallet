'use client';
import React from 'react';
import CoinSyncProgress from 'components/CoinSyncProgress';
import CoinSyncItem from 'components/CoinSyncItem';
import CoinSyncActionButton from 'components/CoinSyncActionButton';
import CoinSyncEmptyState from 'components/CoinSyncEmptyState';
import ConfirmationModal from 'components/ConfirmationModal';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon} from 'components/Home/HomeIcons';
import {CheckCircleIcon} from 'components/Transactions/TxIcons';
import useCoinSync from 'src/hooks/protectedRoutes/wallet/home/coin-sync/useCoinSync';
import styles from './CoinSync.module.css';

// Line check-circle for the cancel confirmation's info row, at the 18px the
// MUI icon had. ConfirmationModal renders it in a portal (outside .page), so
// fill is set inline: globals.css `svg { fill: inherit }` beats the attribute.
const KeptCoinsIcon = ({style, ...props}) => (
  <CheckCircleIcon size={18} style={{...style, fill: 'none'}} {...props} />
);

const CoinSync = () => {
  const {
    handleGoBack,
    isCreatingWallets,
    headerWalletName,
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
    handleStartSync,
    handleCancel,
    handleAddSelectedCoins,
    showLeaveConfirm,
    discardCopy,
    handleConfirmLeave,
    handleCancelLeave,
    showCancelConfirm,
    handleConfirmCancelScan,
    handleDismissCancelScan,
  } = useCoinSync();

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

      {/* No onClose: it can't be dismissed while wallets are created. */}
      <Modal
        open={isCreatingWallets}
        disableEscapeKeyDown
        aria-labelledby='coin-sync-blocker-title'
        aria-describedby='coin-sync-blocker-subtitle'
        slotProps={{backdrop: {className: styles.blockerBackdrop}}}>
        <div className={styles.blockerDialog} role='alertdialog'>
          <div className={styles.blockerHandle} aria-hidden='true' />
          <span className={styles.blockerTile} aria-hidden='true'>
            <span className={styles.blockerSpinner} />
          </span>
          <p id='coin-sync-blocker-title' className={styles.blockerTitle}>
            Creating wallets…
          </p>
          <p id='coin-sync-blocker-subtitle' className={styles.blockerSubtitle}>
            Please wait and keep this page open.
          </p>
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
        infoIcon={KeptCoinsIcon}
        confirmLabel={'Cancel Scan'}
        dismissLabel={'Keep Scanning'}
        onConfirm={handleConfirmCancelScan}
        onDismiss={handleDismissCancelScan}
      />
    </main>
  );
};

export default CoinSync;
