'use client';

import {useMemo, useState} from 'react';
import {isBitcoinChain} from 'utils/notificationAlertHelpers';
import NotificationStepLayout from 'components/NotificationStepLayout';
import s from './NotificationWalletStep.module.css';

const NotificationWalletStep = ({wallets, onSelectWallet}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return wallets;
    const q = search.toLowerCase();
    return wallets.filter(w => w.walletName?.toLowerCase().includes(q));
  }, [wallets, search]);

  return (
    <NotificationStepLayout
      search={search}
      onSearch={setSearch}
      searchPlaceholder='Search wallets...'
      isEmpty={filtered.length === 0}
      emptyText='No wallets found'>
      {filtered.map(w => {
        const count = (w.coins || []).filter(
          c =>
            (c.isInWallet &&
              (c.chain_name === 'ethereum' ||
                c.chain_name === 'binance_smart_chain') &&
              c.type === 'token') ||
            isBitcoinChain(c.chain_name),
        ).length;
        return (
          <button
            key={w.clientId}
            className={s.walletRow}
            onClick={() => onSelectWallet(w)}>
            <div className={s.walletAvatar}>
              {w.walletName?.slice(0, 2)?.toUpperCase() || 'W'}
            </div>
            <div className={s.walletInfo}>
              <span className={s.walletName}>{w.walletName}</span>
              <span className={s.walletSub}>{count} supported coins</span>
            </div>
            <span className={s.chevron}>›</span>
          </button>
        );
      })}
    </NotificationStepLayout>
  );
};

export default NotificationWalletStep;
