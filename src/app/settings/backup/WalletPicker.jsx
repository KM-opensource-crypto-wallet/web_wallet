import React from 'react';
import {
  formatBalance,
  getCoinsCount,
  getTopTwoCoins,
  getWalletTotalBalance,
} from 'dok-wallet-blockchain-networks/helper';
import {CheckIcon} from 'components/Home/HomeIcons';
import s from './WalletPicker.module.css';

// Multi-select list of wallets shared by Backup and Restore: a "Select all"
// header and one glass card of checkbox rows. Same data and behaviour as
// components/WalletSelectionCard, restyled for the settings screens.
const WalletRow = ({
  item,
  isSelected,
  toggleSelect,
  currencySymbol,
  isRestored,
}) => {
  const hasCoinsData = item.coins && Array.isArray(item.coins);

  const walletTypeLabel = item?.isImportWalletWithPrivateKey
    ? `${item?.coins?.[0]?.chain_display_name || ''} Wallet`
    : 'Multi-Coin Wallet';

  const totalBalance = hasCoinsData ? getWalletTotalBalance(item.coins) : 0;
  const topCoins = hasCoinsData ? getTopTwoCoins(item.coins) : [];
  const coinsCount = hasCoinsData ? getCoinsCount(item.coins) : 0;

  return (
    <button
      type='button'
      role='checkbox'
      aria-checked={isRestored ? false : isSelected}
      aria-disabled={isRestored || undefined}
      tabIndex={isRestored ? -1 : 0}
      className={`${s.row} ${isSelected && !isRestored ? s.rowActive : ''} ${
        isRestored ? s.rowRestored : ''
      }`}
      onClick={() => !isRestored && toggleSelect(item.clientId)}>
      <span className={s.avatar} aria-hidden='true'>
        {(item.walletName || '?')[0]}
      </span>

      <span className={s.rowText}>
        <span className={s.rowTitle}>{item.walletName}</span>
        <span className={s.rowHint}>
          {walletTypeLabel}
          {hasCoinsData ? (
            <>
              {' · '}
              {coinsCount} {coinsCount === 1 ? 'coin' : 'coins'}
            </>
          ) : null}
        </span>
      </span>

      {hasCoinsData ? (
        <span className={s.balance}>
          <span className={s.balanceValue}>
            {currencySymbol}
            {formatBalance(totalBalance)}
          </span>
          <span className={s.coins}>
            {topCoins.map((coin, index) => (
              <span key={coin?._id || index} className={s.coin}>
                {coin?.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coin.icon}
                    alt={coin?.chain_display_name || 'coin'}
                  />
                )}
              </span>
            ))}
          </span>
        </span>
      ) : null}

      {isRestored ? (
        <span className={s.restoredPill}>Restored</span>
      ) : (
        <span className={s.check} aria-hidden='true'>
          {isSelected ? <CheckIcon size={14} strokeWidth={3} /> : null}
        </span>
      )}
    </button>
  );
};

const WalletPicker = ({
  wallets,
  selectedWalletIds,
  isAllSelected,
  toggleSelectAll,
  toggleSelect,
  currencySymbol = '$',
  isRestored = () => false,
  getKey = wallet => wallet.clientId,
  label,
}) => (
  <section className={s.picker} aria-label={label}>
    <div className={s.head}>
      <button
        type='button'
        role='checkbox'
        aria-checked={isAllSelected}
        className={`${s.selectAll} ${isAllSelected ? s.rowActive : ''}`}
        onClick={toggleSelectAll}>
        <span className={s.check} aria-hidden='true'>
          {isAllSelected ? <CheckIcon size={14} strokeWidth={3} /> : null}
        </span>
        {isAllSelected ? 'Deselect All' : 'Select All'}
      </button>
      <span className={s.count} aria-live='polite'>
        {selectedWalletIds.length}/{wallets.length} Selected
      </span>
    </div>

    <div className={s.card}>
      {wallets.map(wallet => (
        <WalletRow
          key={getKey(wallet)}
          item={wallet}
          isSelected={selectedWalletIds.includes(wallet.clientId)}
          toggleSelect={toggleSelect}
          currencySymbol={currencySymbol}
          isRestored={isRestored(wallet)}
        />
      ))}
    </div>
  </section>
);

export default WalletPicker;
