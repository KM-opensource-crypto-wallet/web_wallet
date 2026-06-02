'use client';

import {useEffect, useRef, useState} from 'react';
import {directionLabel, truncateAddress} from 'utils/notificationAlertHelpers';
import CoinAvatar from 'components/CoinAvatar';
import ChainBadge from 'components/ChainBadge';
import s from './NotificationAlertItem.module.css';

const NotificationAlertItem = ({item, onEdit, onDelete}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const dir = directionLabel(item);

  return (
    <div className={s.alertItem}>
      <CoinAvatar icon={item.coinIcon} symbol={item.coinSymbol} size='list' />
      <div className={s.alertInfo}>
        <div className={s.alertTopRow}>
          <span className={s.alertSymbol}>{item.coinSymbol}</span>
          <ChainBadge chain={item.chainDisplayName || item.chainName} />
        </div>
        <span className={s.alertWallet}>{item.walletName}</span>
        <span className={s.alertAddress}>{truncateAddress(item.wallet)}</span>
        <div className={s.alertMeta}>
          <span className={s.alertAmount}>
            ≥ {item.minAmount} {item.coinSymbol}
          </span>
          {(dir === 'receive' || dir === 'both') && (
            <span className={`${s.badge} ${s.badgeReceive}`}>Receive</span>
          )}
          {(dir === 'send' || dir === 'both') && (
            <span className={`${s.badge} ${s.badgeSend}`}>Send</span>
          )}
        </div>
      </div>
      <div className={s.menuWrap} ref={menuRef}>
        <button
          className={s.menuBtn}
          onClick={() => setMenuOpen(o => !o)}
          aria-label='More options'>
          ⋮
        </button>
        {menuOpen && (
          <div className={s.menuDropdown}>
            <button
              className={s.menuItem}
              onClick={() => {
                setMenuOpen(false);
                onEdit(item);
              }}>
              Edit
            </button>
            <button
              className={`${s.menuItem} ${s.menuItemDanger}`}
              onClick={() => {
                setMenuOpen(false);
                onDelete(item);
              }}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationAlertItem;
