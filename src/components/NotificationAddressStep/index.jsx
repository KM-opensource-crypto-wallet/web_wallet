'use client';

import {
  buildAddressOptions,
  coinKey,
  isBitcoinChain,
} from 'utils/notificationAlertHelpers';
import CoinAvatar from 'components/CoinAvatar';
import ChainBadge from 'components/ChainBadge';
import NotificationStepLayout from 'components/NotificationStepLayout';
import s from './NotificationAddressStep.module.css';

const NotificationAddressStep = ({
  wallet,
  selectedCoinEntries,
  addressMap,
  onAddressChange,
  onNext,
}) => (
  <NotificationStepLayout footerLabel='Next' onFooterPress={onNext}>
    {selectedCoinEntries.map(({coin}) => {
      const key = coinKey(wallet.clientId, coin._id);
      const isBitcoin = isBitcoinChain(coin.chain_name);

      if (isBitcoin) {
        const addressCount =
          coin.deriveAddresses?.length || (coin.address ? 1 : 0);
        return (
          <div key={key} className={s.addressSection}>
            <div className={s.coinHeader}>
              <CoinAvatar icon={coin.icon} symbol={coin.symbol} size='sm' />
              <span className={s.coinSymbol}>{coin.symbol}</span>
              <ChainBadge chain={coin.chain_display_name || coin.chain_name} />
            </div>
            <div className={s.bitcoinInfo}>
              <span className={s.bitcoinInfoIcon}>ℹ</span>
              <span className={s.bitcoinInfoText}>
                {`All ${addressCount} address${addressCount !== 1 ? 'es' : ''} will be monitored automatically`}
              </span>
            </div>
          </div>
        );
      }

      const options = buildAddressOptions(coin);
      return (
        <div key={key} className={s.addressSection}>
          <div className={s.coinHeader}>
            <CoinAvatar icon={coin.icon} symbol={coin.symbol} size='sm' />
            <span className={s.coinSymbol}>{coin.symbol}</span>
            <ChainBadge chain={coin.chain_display_name || coin.chain_name} />
          </div>
          <select
            className={s.select}
            value={addressMap[key] || ''}
            onChange={e => onAddressChange(key, e.target.value)}>
            {options.length === 0 ? (
              <option value=''>No address available</option>
            ) : (
              options.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            )}
          </select>
        </div>
      );
    })}
  </NotificationStepLayout>
);

export default NotificationAddressStep;
