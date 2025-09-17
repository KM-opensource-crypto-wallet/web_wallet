import React, {useCallback} from 'react';
import {
  CheckBoxOutlineBlank,
  Error,
  ArrowForward,
  ContentCopy,
  InfoOutlined,
  CheckBox,
} from '@mui/icons-material';
import {currencySymbol} from 'data/currency';
import CoinIcon from 'components/CoinIcon';
import styles from './BatchTransactionItem.module.css';
import {isBitcoinChain} from 'dok-wallet-blockchain-networks/helper';

const BatchTransactionItem = ({
  item,
  isSelected,
  isSelectionMode,
  localCurrency,
  onToggleSelection,
}) => {
  const isToken = item?.type === 'token';
  const isBitcoin = isBitcoinChain(item?.chain_name);

  const onCopyAddress = useCallback(async address => {
    try {
      await navigator.clipboard.writeText(address);
      // You can replace this with your preferred toast notification library
      console.log('Address copied to clipboard');
      // Example with react-hot-toast: toast.success('Copied Address');
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  }, []);

  return (
    <button
      className={`${styles.transactionItem} ${isSelected ? styles.selectedTransactionItem : ''}`}
      onClick={() => isSelectionMode && onToggleSelection?.(item.transactionId)}
      disabled={!isSelectionMode}
      style={{
        backgroundColor: isSelected
          ? 'var(--lightBackground)'
          : 'var(--secondaryBackgroundColor)',
        borderColor: isSelected ? 'var(--background)' : 'var(--whiteOutline)',
        borderWidth: isSelected ? '2px' : '1px',
      }}>
      <div className={styles.topItem}>
        {isSelectionMode && (
          <div className={styles.selectionIndicator}>
            {isSelected ? (
              <CheckBox size={24} htmlColor={'var(--background)'} />
            ) : (
              <CheckBoxOutlineBlank size={24} htmlColor={'var(--gray)'} />
            )}
          </div>
        )}
        <CoinIcon item={item.coinInfo} />
        <div className={styles.transactionContent}>
          <div className={styles.transactionHeader}>
            <div className={styles.titleContainer}>
              <div className={styles.coinNameRow}>
                <h3 className={styles.transactionTitle}>
                  {item.coinInfo.symbol}
                </h3>
                {(isToken || isBitcoin) && (
                  <p className={styles.chainDisplayName}>
                    {item?.chain_display_name}
                  </p>
                )}
              </div>
              <p className={styles.coinFullName}>{item.coinInfo.name}</p>
            </div>
            <div className={styles.amountContainer}>
              <span className={styles.transactionAmount}>
                {item.transferData.amount}
              </span>
              <span className={styles.currencySymbol}>
                {currencySymbol[localCurrency] || ''}
                {item?.transferData?.fiatAmount}
              </span>
              {item.is_exceed_balance && (
                <div className={styles.exceedBalanceContainer}>
                  <Error size={12} htmlColor='#ff4444' />
                  <span className={styles.exceedBalanceText}>
                    Balance exceeded
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.addressSection}>
        <div className={styles.addressRow}>
          <div className={styles.addressContainer}>
            <div className={styles.subAddressContainer}>
              <span className={styles.addressLabel}>From</span>
              <span className={styles.addressText}>
                {item.transferData.fromAddress.slice(0, 8)}...
                {item.transferData.fromAddress.slice(-6)}
              </span>
            </div>
            <button
              className={styles.copyButton}
              onClick={e => {
                e.stopPropagation();
                onCopyAddress(item?.transferData?.fromAddress || '');
              }}
              type='button'>
              <ContentCopy size={16} htmlColor={'var(--background)'} />
            </button>
          </div>

          <div className={styles.arrowContainer}>
            <ArrowForward size={16} htmlColor={'var(--gray)'} />
          </div>

          <div className={styles.addressContainer}>
            <div className={styles.subAddressContainer}>
              <span className={styles.addressLabel}>To</span>
              <span className={styles.addressText}>
                {item?.transferData?.toAddress?.slice?.(0, 8)}...
                {item?.transferData?.toAddress?.slice?.(-6)}
              </span>
            </div>
            <button
              className={styles.copyButton}
              onClick={e => {
                e.stopPropagation();
                onCopyAddress(item?.transferData?.toAddress || '');
              }}
              type='button'>
              <ContentCopy size={16} htmlColor={'var(--background)'} />
            </button>
          </div>
        </div>

        {item.is_exceed_balance && (
          <div className={styles.requireAmountSection}>
            <InfoOutlined size={16} htmlColor='#ff9500' />
            <span className={styles.requireAmountText}>
              Required amount: {item.require_amount} {item.coinInfo.symbol}
            </span>
          </div>
        )}
      </div>
    </button>
  );
};

export default BatchTransactionItem;
