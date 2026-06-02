'use client';

import {coinKey} from 'utils/notificationAlertHelpers';
import CoinAvatar from 'components/CoinAvatar';
import s from './NotificationCoinPickerModal.module.css';

const NotificationCoinPickerModal = ({
  visible,
  wallet,
  selectedCoinEntries,
  configCoinKey,
  onSelect,
  onDismiss,
}) => {
  if (!visible) return null;

  return (
    <div className={s.overlay} onClick={onDismiss}>
      <div className={s.card} onClick={e => e.stopPropagation()}>
        <p className={s.title}>Select Coin</p>
        {selectedCoinEntries.map(e => {
          const key = coinKey(wallet?.clientId || e.walletClientId, e.coin._id);
          const isActive = key === configCoinKey;
          return (
            <button
              key={key}
              className={`${s.row} ${isActive ? s.rowActive : ''}`}
              onClick={() => onSelect(key)}>
              <CoinAvatar icon={e.coin.icon} symbol={e.coin.symbol} size='sm' />
              <span className={s.rowLabel}>{e.coin.symbol}</span>
              {isActive && <span className={s.checkmark}>✓</span>}
            </button>
          );
        })}
        <button className={s.cancelBtn} onClick={onDismiss}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default NotificationCoinPickerModal;
