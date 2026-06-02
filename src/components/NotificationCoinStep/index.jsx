'use client';

import {useMemo, useState} from 'react';
import {coinKey, isBitcoinChain} from 'utils/notificationAlertHelpers';
import CoinAvatar from 'components/CoinAvatar';
import ChainBadge from 'components/ChainBadge';
import NotificationStepLayout from 'components/NotificationStepLayout';
import s from './NotificationCoinStep.module.css';

const NotificationCoinStep = ({wallet, selectedKeys, onToggle, onNext}) => {
  const [search, setSearch] = useState('');

  const coins = useMemo(() => {
    const allCoins = (wallet?.coins || []).filter(
      c =>
        (c.isInWallet &&
          (c.chain_name === 'ethereum' ||
            c.chain_name === 'binance_smart_chain') &&
          c.type === 'token') ||
        isBitcoinChain(c.chain_name),
    );

    // Deduplicate Bitcoin variants: one entry per symbol, prefer chain_name='bitcoin'
    const bitcoinBySymbol = new Map();
    const evmCoins = [];
    for (const c of allCoins) {
      if (isBitcoinChain(c.chain_name)) {
        const prev = bitcoinBySymbol.get(c.symbol);
        if (!prev || c.chain_name === 'bitcoin') {
          bitcoinBySymbol.set(c.symbol, c);
        }
      } else {
        evmCoins.push(c);
      }
    }
    return [...evmCoins, ...bitcoinBySymbol.values()];
  }, [wallet]);

  const filtered = useMemo(() => {
    if (!search.trim()) return coins;
    const q = search.toLowerCase();
    return coins.filter(
      c =>
        c.symbol?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q),
    );
  }, [coins, search]);

  const selCount = selectedKeys.size;

  return (
    <NotificationStepLayout
      search={search}
      onSearch={setSearch}
      searchPlaceholder='Search coins...'
      isEmpty={filtered.length === 0}
      emptyText='No EVM tokens available in this wallet'
      footerLabel={selCount > 0 ? `Next (${selCount} selected)` : 'Next'}
      onFooterPress={onNext}
      footerDisabled={selCount === 0}>
      {filtered.map(coin => {
        const key = coinKey(wallet.clientId, coin._id);
        const checked = selectedKeys.has(key);
        return (
          <label key={key} className={s.coinRow}>
            <CoinAvatar icon={coin.icon} symbol={coin.symbol} size='md' />
            <div className={s.coinInfo}>
              <span className={s.coinSymbol}>{coin.symbol}</span>
              <ChainBadge chain={coin.chain_display_name || coin.chain_name} />
            </div>
            <input
              type='checkbox'
              className={s.checkbox}
              checked={checked}
              onChange={() => onToggle(coin)}
            />
          </label>
        );
      })}
    </NotificationStepLayout>
  );
};

export default NotificationCoinStep;
