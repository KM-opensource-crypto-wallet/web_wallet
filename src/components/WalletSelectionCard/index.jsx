import React from 'react';
import {
  formatBalance,
  getCoinsCount,
  getTopTwoCoins,
  getWalletTotalBalance,
} from 'dok-wallet-blockchain-networks/helper';
import s from './WalletSelectionCard.module.css';

const WalletSelectionCard = ({
  item,
  isSelected,
  toggleSelect,
  currencySymbol = '$',
  isRestored = false,
}) => {
  const hasCoinsData = item.coins && Array.isArray(item.coins);

  const walletTypeLabel = item?.isImportWalletWithPrivateKey
    ? `${item?.coins?.[0]?.chain_display_name || ''} Wallet`
    : 'Multi-Coin Wallet';

  const totalBalance = hasCoinsData ? getWalletTotalBalance(item.coins) : 0;
  const topCoins = hasCoinsData ? getTopTwoCoins(item.coins) : [];
  const coinsCount = hasCoinsData ? getCoinsCount(item.coins) : 0;

  return (
    <div
      className={`${s.walletCard} ${isSelected ? s.walletCardSelected : ''} ${
        isRestored ? s.walletCardDisabled : ''
      }`}
      onClick={() => !isRestored && toggleSelect(item.clientId)}
      role='button'
      tabIndex={isRestored ? -1 : 0}
      onKeyDown={e => {
        if (!isRestored && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          toggleSelect(item.clientId);
        }
      }}>
      <div className={s.headerRow}>
        {isRestored ? (
          <div className={s.restoredPill}>
            <span className={s.restoredText}>Restored</span>
          </div>
        ) : (
          <input
            type='checkbox'
            className={s.checkbox}
            checked={isSelected}
            onChange={() => toggleSelect(item.clientId)}
            onClick={e => e.stopPropagation()}
            aria-label={`Select ${item.walletName}`}
          />
        )}
        <div className={s.titleWrapper}>
          <p
            className={`${s.walletName} ${
              isSelected ? s.walletNameSelected : ''
            } ${isRestored ? s.walletNameDisabled : ''}`}>
            {item.walletName}
          </p>
          <p className={s.walletType}>{walletTypeLabel}</p>
        </div>
      </div>

      {hasCoinsData && (
        <div className={s.balanceSection}>
          <div className={s.balanceInfo}>
            <p className={s.balanceLabel}>Total Balance</p>
            <p
              className={`${s.balanceValue} ${
                isRestored ? s.balanceValueDisabled : ''
              }`}>
              {currencySymbol}
              {formatBalance(totalBalance)}
            </p>
          </div>

          <div className={s.coinsInfo}>
            <div className={s.topCoinsContainer}>
              {topCoins.map((coin, index) => (
                <div
                  key={coin?._id || index}
                  className={`${s.coinIconWrapper} ${
                    index > 0 ? s.coinIconOverlap : ''
                  }`}>
                  {coin?.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coin.icon}
                      alt={coin?.chain_display_name || 'coin'}
                      className={s.coinIcon}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className={s.coinsCountText}>
              {coinsCount} {coinsCount === 1 ? 'coin' : 'coins'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSelectionCard;
