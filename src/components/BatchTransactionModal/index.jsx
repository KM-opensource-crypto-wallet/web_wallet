'use client';
import React, {useCallback, useMemo, useEffect, useState} from 'react';
import {Close, Delete} from '@mui/icons-material';
import DokDropdown from 'components/DokDropdown';
import BatchTransactionItem from 'components/BatchTransactionItem';
import {useDispatch, useSelector} from 'react-redux';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  removeBatchTransaction,
  setSelectedChain,
  setSelectedAddress,
  setIsSelectionMode,
  toggleSelectedItem,
  clearSelectedItems,
  initializeFilters,
} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSlice';
import {
  getUniqueChains,
  getUniqueAddresses,
  getFilteredTransactions,
  getWalletIdFromTransactions,
  getSelectedChain,
  getSelectedAddress,
  getIsSelectionMode,
  getSelectedItems,
  getFilterLoading,
  getShouldShowDropdowns,
  getBatchTransactionIsValid,
  getBatchTransactionInvalidReason,
} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSelectors';
import {
  calculateEstimateFee,
  updateCurrentTransferData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {useRouter} from 'next/navigation';
import Loading from 'components/Loading';
import styles from './BatchTransactionModal.module.css';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';

const BatchTransactionModal = ({isVisible, onDismiss, transactions}) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isVisible);
  const localCurrency = useSelector(getLocalCurrency);
  const selectedChain = useSelector(getSelectedChain);
  const selectedAddress = useSelector(getSelectedAddress);
  const isSelectionMode = useSelector(getIsSelectionMode);
  const selectedItems = useSelector(getSelectedItems);
  const filteredTransactions = useSelector(getFilteredTransactions);
  const uniqueChains = useSelector(getUniqueChains);
  const uniqueAddresses = useSelector(getUniqueAddresses);
  const filterLoading = useSelector(getFilterLoading);
  const shouldShowDropdowns = useSelector(getShouldShowDropdowns);
  const isValid = useSelector(getBatchTransactionIsValid);
  const invalid_reason = useSelector(getBatchTransactionInvalidReason);

  const wallet_id = useMemo(() => {
    return getWalletIdFromTransactions(null, filteredTransactions);
  }, [filteredTransactions]);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsClosing(false);
      if (transactions) {
        dispatch(
          initializeFilters({
            transactions,
            selectedChain,
            selectedAddress,
            isFetchDetails: true,
          }),
        );
      }
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 250); // Match the animation duration
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, isVisible, shouldRender]);

  const handleToggleSelection = useCallback(
    transactionId => {
      dispatch(toggleSelectedItem(transactionId));
    },
    [dispatch],
  );

  const handleDeleteSelected = useCallback(() => {
    dispatch(
      removeBatchTransaction({
        wallet_id,
        transactionIds: selectedItems,
      }),
    );
    dispatch(clearSelectedItems());
    dispatch(setIsSelectionMode(false));
    const isDeleteAll = selectedItems?.length === filteredTransactions.length;
    if (isDeleteAll) {
      dispatch(setSelectedAddress(''));
      dispatch(setSelectedChain(''));
    }
    if (transactions?.length !== selectedItems?.length) {
      dispatch(
        initializeFilters({
          transactions,
          selectedChain: !isDeleteAll ? selectedChain : '',
          selectedAddress: !isDeleteAll ? selectedAddress : '',
        }),
      );
    }
  }, [
    dispatch,
    filteredTransactions.length,
    selectedAddress,
    selectedChain,
    selectedItems,
    transactions,
    wallet_id,
  ]);

  const handleToggleSelectionMode = useCallback(() => {
    dispatch(setIsSelectionMode(!isSelectionMode));
    dispatch(clearSelectedItems());
  }, [dispatch, isSelectionMode]);

  const handleSubmit = useCallback(() => {
    const calls = filteredTransactions?.reduce((acc, item) => {
      acc.push(item.calls);
      return acc;
    }, []);
    const transferData = {
      currentCoin: filteredTransactions?.[0]?.coinInfo,
      isBatchTransaction: true,
      calls: calls,
      transactionsData: filteredTransactions,
    };
    dispatch(updateCurrentTransferData(transferData));
    dispatch(
      calculateEstimateFee({
        currentCoin: filteredTransactions?.[0]?.coinInfo,
        transferData,
        isBatchTransaction: true,
        calls: calls,
      }),
    );
    onDismiss();
    dispatch(
      setRouteStateData({
        transfer: {
          fromScreen: 'BatchTransaction',
        },
      }),
    );
    router.push('/home/confirm-batch');
  }, [dispatch, filteredTransactions, router, onDismiss]);

  const handleChainChange = useCallback(
    event => {
      const foundTransaction = transactions?.find(
        subItem => subItem?.coinInfo?.chain_name === event.target?.value,
      );
      dispatch(setSelectedAddress(foundTransaction?.coinInfo?.address));
      dispatch(setSelectedChain(event.target?.value));
      dispatch(clearSelectedItems());
      dispatch(
        initializeFilters({
          transactions,
          selectedChain: event.target?.value,
          selectedAddress: foundTransaction?.coinInfo?.address,
          isFetchDetails: true,
        }),
      );
    },
    [dispatch, transactions],
  );

  const handleAddressChange = useCallback(
    event => {
      dispatch(setSelectedAddress(event.target.value));
      dispatch(clearSelectedItems());
      dispatch(
        initializeFilters({
          transactions,
          selectedChain,
          selectedAddress: event.target.value,
          isFetchDetails: true,
        }),
      );
    },
    [dispatch, transactions, selectedChain],
  );

  const handleBackdropClick = useCallback(
    e => {
      if (e.target === e.currentTarget) {
        onDismiss();
      }
    },
    [onDismiss],
  );

  if (!shouldRender) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div
        className={`${styles.modalContent} ${isClosing ? styles.closing : ''}`}>
        <div className={styles.container}>
          <div className={styles.header}>
            <button
              className={styles.selectionToggle}
              onClick={handleToggleSelectionMode}>
              <span className={styles.selectionToggleText}>
                {isSelectionMode ? 'Cancel' : 'Select'}
              </span>
            </button>
            <h2 className={styles.title}>Batch Transactions</h2>
            <button className={styles.closeButton} onClick={onDismiss}>
              <Close htmlColor={'var(--font)'} />
            </button>
          </div>

          {isSelectionMode && selectedItems.length > 0 && (
            <div className={styles.selectionActions}>
              <span className={styles.selectionCount}>
                {selectedItems.length} selected
              </span>
              <button
                className={styles.deleteSelectedButton}
                onClick={handleDeleteSelected}>
                <Delete htmlColor={'white'} />
                <span className={styles.deleteSelectedText}>Delete</span>
              </button>
            </div>
          )}

          {shouldShowDropdowns && (
            <div className={styles.filtersContainer}>
              {uniqueChains.length > 1 && (
                <div className={styles.filterItem}>
                  <div className={styles.dropdownContainer}>
                    <DokDropdown
                      listData={uniqueChains}
                      value={selectedChain}
                      onValueChange={handleChainChange}
                      placeholder='Select Chain'
                    />
                  </div>
                </div>
              )}
              {uniqueAddresses.length > 1 && (
                <div className={styles.filterItem}>
                  <div className={styles.dropdownContainer}>
                    <DokDropdown
                      listData={uniqueAddresses}
                      value={selectedAddress}
                      onValueChange={handleAddressChange}
                      placeholder='Select Address'
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={styles.transactionListContainer}>
            {filterLoading ? (
              <div className={styles.loadingContainer}>
                <Loading height={0} />
              </div>
            ) : (
              <>
                <div className={styles.transactionList}>
                  {filteredTransactions.length === 0 ? (
                    <div className={styles.emptyContainer}>
                      <p className={styles.emptyText}>No transactions found</p>
                    </div>
                  ) : (
                    filteredTransactions.map(item => {
                      const isSelected = selectedItems.includes(
                        item.transactionId,
                      );
                      return (
                        <BatchTransactionItem
                          key={item.transactionId}
                          item={item}
                          isSelected={isSelected}
                          isSelectionMode={isSelectionMode}
                          localCurrency={localCurrency}
                          onToggleSelection={handleToggleSelection}
                        />
                      );
                    })
                  )}
                </div>
                <div className={styles.bottomActionsContainer}>
                  {invalid_reason && (
                    <div className={styles.invalidReasonContainer}>
                      <p className={styles.invalidReasonText}>
                        {invalid_reason}
                      </p>
                    </div>
                  )}
                  <div className={styles.btnContainer}>
                    <button
                      disabled={!isValid || filterLoading}
                      className={styles.button}
                      style={{
                        backgroundColor:
                          isValid && !filterLoading
                            ? 'var(--background)'
                            : 'var(--gray)',
                      }}
                      onClick={handleSubmit}>
                      <span className={styles.buttonTitle}>
                        {filterLoading ? 'Loading...' : 'Next'}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchTransactionModal;
