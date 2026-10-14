'use client';
import React, {memo, useCallback} from 'react';
import {useSelector} from 'react-redux';
import {isBitcoinChain} from 'dok-wallet-blockchain-networks/helper';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {currencySymbol} from 'src/data/lists/currency';
import CoinIcon from 'components/CoinIcon';
import {CheckIcon} from 'components/Home/HomeIcons';
import styles from './CoinSyncItem.module.css';

// One coin found with a balance. Once the scan completes it becomes a
// checkbox row for choosing which coins to add.
const CoinSyncItem = ({coin, isSelectable, isSelected, onToggle}) => {
  const localCurrency = useSelector(getLocalCurrency);
  const {totalBalance, totalBalanceCourse, symbol} = coin;
  const showNetwork =
    coin?.type === 'token' || isBitcoinChain(coin?.chain_name);

  const handleClick = useCallback(() => {
    if (isSelectable) onToggle();
  }, [isSelectable, onToggle]);

  return (
    <div
      className={`${styles.row} ${isSelectable ? styles.selectable : ''} ${
        isSelectable && isSelected ? styles.selected : ''
      }`}
      onClick={handleClick}
      role={isSelectable ? 'checkbox' : undefined}
      aria-checked={isSelectable ? isSelected : undefined}
      aria-label={isSelectable ? `Select ${coin?.name || symbol}` : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onKeyDown={
        isSelectable
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }>
      {isSelectable ? (
        <span
          className={`${styles.check} ${isSelected ? styles.checkOn : ''}`}
          aria-hidden='true'>
          {isSelected ? <CheckIcon size={14} strokeWidth={3} /> : null}
        </span>
      ) : null}

      <span className={styles.icon}>
        <CoinIcon item={coin} />
      </span>

      <span className={styles.text}>
        <span className={styles.titleRow}>
          <span className={styles.symbol}>{symbol}</span>
          {showNetwork && coin?.chain_display_name ? (
            <span className={styles.chip}>{coin.chain_display_name}</span>
          ) : null}
        </span>
        <span className={styles.name}>{coin?.name}</span>
      </span>

      <span className={styles.amounts}>
        <span className={styles.amount}>
          {totalBalance || '0'} {symbol}
        </span>
        <span className={styles.fiat}>
          {currencySymbol[localCurrency] || ''}
          {totalBalanceCourse}
        </span>
      </span>
    </div>
  );
};

export default memo(CoinSyncItem);
