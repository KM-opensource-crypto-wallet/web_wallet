import React, {useMemo, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {switchWalletPath} from 'utils/routes';
import {findCoinBySlug} from 'utils/common';
import {currencySymbol} from 'src/data/lists/currency';
import {
  selectCurrentWalletClientId,
  selectVisibleWallets,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  refreshCoins,
  setCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {resetPaymentUrl} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import ModalCreateWallet from 'components/ModalCreateWallet';
import GeneralButton from 'components/Button';
import HomeSheet from './HomeSheet';
import {CheckIcon, PlusIcon, SearchIcon, SettingsIcon} from './HomeIcons';
import {MASK} from './AssetRow';
import s from './Home.module.css';

const walletTotal = wallet =>
  (wallet?.coins || []).reduce(
    (sum, coin) =>
      coin?.isInWallet ? sum + (parseFloat(coin?.totalCourse) || 0) : sum,
    0,
  );

export const formatMoney = (value, symbol) =>
  `${symbol || ''}${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// "Your wallets" sheet: switch the active wallet (staying on the current
// screen), add one, or go to the wallets page. Hidden (locked) wallets are left out, as everywhere else.
const WalletSwitcher = ({visible, onClose, hidden, localCurrency}) => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const wallets = useSelector(selectVisibleWallets, shallowEqual);
  const currentClientId = useSelector(selectCurrentWalletClientId);
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? wallets.filter(item => item?.walletName?.toLowerCase().includes(q))
      : wallets;
  }, [wallets, query]);

  const pick = wallet => {
    onClose();
    if (wallet.clientId === currentClientId) {
      return;
    }
    dispatch(resetPaymentUrl());
    dispatch(setCurrentWalletClientId(wallet.clientId));
    // Stay on the same screen in the new wallet.
    const hasCoin = slug =>
      !!findCoinBySlug(
        (wallet.coins || []).filter(coin => coin?.isInWallet),
        slug,
      );
    const nextPath = switchWalletPath(pathname, wallet.clientId, hasCoin);
    // Coin screens refresh their own coin (see send/[coinSlug]/layout.jsx);
    // everywhere else shows wallet-wide balances, so refresh the new wallet.
    if (!nextPath.includes('/home/send/')) {
      dispatch(refreshCoins({walletClientId: wallet.clientId}));
    }
    router.push(nextPath);
  };

  return (
    <>
      <HomeSheet
        visible={visible}
        onClose={onClose}
        title='Your wallets'
        labelId='wallet-switcher-title'>
        {wallets.length > 4 ? (
          <label className={s.sheetSearch}>
            <SearchIcon size={17} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='Search wallets'
              aria-label='Search wallets'
            />
          </label>
        ) : null}
        <ul className={s.walletList}>
          {list.map(wallet => {
            const active = wallet.clientId === currentClientId;
            const coinCount = (wallet?.coins || []).filter(
              coin => coin?.isInWallet,
            ).length;
            return (
              <li key={wallet.clientId}>
                <GeneralButton
                  variant='unstyled'
                  className={`${s.walletRow} ${active ? s.walletRowActive : ''}`}
                  aria-current={active || undefined}
                  onClick={() => pick(wallet)}>
                  <span className={s.walletAvatar}>
                    {(wallet?.walletName?.[0] || 'W').toUpperCase()}
                  </span>
                  <span className={s.walletText}>
                    <span className={s.walletName}>{wallet?.walletName}</span>
                    <span className={s.walletMeta}>
                      {hidden
                        ? MASK
                        : formatMoney(
                            walletTotal(wallet),
                            currencySymbol[localCurrency],
                          )}{' '}
                      · {coinCount} {coinCount === 1 ? 'coin' : 'coins'}
                    </span>
                  </span>
                  {active ? (
                    <span className={s.walletCheck}>
                      <CheckIcon size={13} />
                    </span>
                  ) : null}
                </GeneralButton>
              </li>
            );
          })}
          {list.length === 0 ? (
            <li className={s.sheetEmpty}>No wallets found</li>
          ) : null}
        </ul>
        <div className={s.sheetActions}>
          <GeneralButton
            variant='unstyled'
            className={s.sheetAccent}
            onClick={() => {
              onClose();
              setCreateOpen(true);
            }}>
            <PlusIcon size={16} />
            Add wallet
          </GeneralButton>
          <GeneralButton
            variant='unstyled'
            className={s.sheetGhost}
            onClick={() => {
              onClose();
              router.push('/wallets');
            }}>
            <SettingsIcon size={16} />
            Manage wallets
          </GeneralButton>
        </div>
      </HomeSheet>
      <ModalCreateWallet
        visible={createOpen}
        hideModal={() => setCreateOpen(false)}
      />
    </>
  );
};

export default WalletSwitcher;
