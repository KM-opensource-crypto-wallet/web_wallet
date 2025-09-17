import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {getBatchTransactions} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSelectors';
import {selectCurrentWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {clearAllBatchTransactions} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSlice';
import styles from './BatchTransactionBanner.module.css';
import {Delete} from '@mui/icons-material';
import BatchTransactionModal from 'components/BatchTransactionModal';
import ModalConfirm from 'components/ModalConfirm';

const BatchTransactionBanner = () => {
  const batchTransactions = useSelector(getBatchTransactions);
  const currentWallet = useSelector(selectCurrentWallet);
  const dispatch = useDispatch();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showBatchTransactionModal, setShowBatchTransactionModal] =
    useState(false);

  const {transactionCount, displayText, walletTransactions} = useMemo(() => {
    if (!batchTransactions || !currentWallet?.clientId) {
      return {transactionCount: 0, chainCount: 0, displayText: ''};
    }

    const localWalletTransactions =
      batchTransactions[currentWallet.clientId] || [];
    const totalTransactions = localWalletTransactions.length || 0;

    if (totalTransactions === 0) {
      return {transactionCount: 0, chainCount: 0, displayText: ''};
    }

    // Get unique chains from transactions
    const chains = [
      ...new Set(
        localWalletTransactions.map(tx => tx.coinInfo?.chain_display_name),
      ),
    ].filter(Boolean);
    let chainText = '';
    if (chains.length === 1) {
      chainText = ` on ${chains[0]}`;
    } else if (chains.length > 1) {
      chainText = ` across ${chains.length} chains (${chains.join(', ')})`;
    }

    const transactionText = `${totalTransactions} ${
      totalTransactions === 1 ? 'transaction' : 'transactions'
    }`;

    return {
      transactionCount: totalTransactions,
      chainCount: chains.length,
      displayText: `${transactionText} pending ${chainText}. Tap to view details.`,
      walletTransactions: localWalletTransactions,
    };
  }, [batchTransactions, currentWallet]);

  const handleClose = useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    setShowConfirmModal(false);
    dispatch(clearAllBatchTransactions({wallet_id: currentWallet?.clientId}));
  }, [dispatch, currentWallet?.clientId]);

  const handleCancelDelete = useCallback(() => {
    setShowConfirmModal(false);
  }, []);

  const onPressView = useCallback(() => {
    setShowBatchTransactionModal(true);
  }, []);

  const onDismissSheet = useCallback(() => {
    setShowBatchTransactionModal(false);
  }, []);

  useEffect(() => {
    if (transactionCount === 0) {
      setShowBatchTransactionModal(false);
    }
  }, [transactionCount]);

  if (transactionCount === 0) {
    return null;
  }

  return (
    <div className={styles.batchView}>
      <div className={styles.contentContainer}>
        <p className={styles.batchTitle}>{displayText}</p>
        <div className={styles.buttonsContainer}>
          <button className={styles.viewButton} onClick={onPressView}>
            <span className={styles.viewButtonTitle}>View Details</span>
          </button>
          <button className={styles.deleteButton} onClick={handleClose}>
            <Delete htmlColor={'white'} />
          </button>
        </div>
      </div>
      <ModalConfirm
        visible={showConfirmModal}
        title='Clear Batch Transactions'
        description={`Are you sure you want to clear all ${transactionCount} pending batch ${
          transactionCount === 1 ? 'transaction' : 'transactions'
        }? This action cannot be undone.`}
        onPressYes={handleConfirmDelete}
        onPressNo={handleCancelDelete}
        yesButtonTitle='Clear All'
        noButtonTitle='Cancel'
      />
      <BatchTransactionModal
        transactions={walletTransactions}
        onDismiss={onDismissSheet}
        isVisible={showBatchTransactionModal}
      />
    </div>
  );
};

export default BatchTransactionBanner;
