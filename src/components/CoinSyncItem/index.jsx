'use client';
import React, {memo, useCallback} from 'react';
import {useSelector} from 'react-redux';
import CheckBox from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlank from '@mui/icons-material/CheckBoxOutlineBlank';
import {isBitcoinChain} from 'dok-wallet-blockchain-networks/helper';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {currencySymbol} from 'data/currency';
import CoinIcon from 'components/CoinIcon';
import styles from './CoinSyncItem.module.css';

const CoinSyncItem = ({coin, isSelectable, isSelected, onToggle}) => {
  const localCurrency = useSelector(getLocalCurrency);
  const {totalBalance, totalBalanceCourse, symbol} = coin;
  const isToken = coin?.type === 'token';
  const isBitcoin = isBitcoinChain(coin?.chain_name);

  const handleClick = useCallback(() => {
    if (isSelectable) onToggle();
  }, [isSelectable, onToggle]);

  return (
    <div
      className={`${styles.container} ${isSelectable ? styles.selectable : ''}`}
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
      {isSelectable && (
        <div className={styles.checkboxContainer}>
          {isSelected ? (
            <CheckBox sx={{color: 'var(--background)', fontSize: 24}} />
          ) : (
            <CheckBoxOutlineBlank sx={{color: 'var(--gray)', fontSize: 24}} />
          )}
        </div>
      )}

      <CoinIcon item={coin} />

      <div className={styles.list}>
        <div className={styles.box}>
          <div className={styles.item}>
            <div className={styles.rowStyle}>
              <p className={styles.title}>{symbol}</p>
              {(isToken || isBitcoin) && coin?.chain_display_name && (
                <span className={styles.chainTag}>
                  {coin.chain_display_name}
                </span>
              )}
            </div>
            <p className={styles.text}>{coin?.name}</p>
          </div>

          <div className={styles.itemNumber}>
            <p className={styles.title}>
              {totalBalance || '0'} {symbol}
            </p>
            <p className={styles.text}>
              {currencySymbol[localCurrency] || ''}
              {totalBalanceCourse}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(CoinSyncItem);
