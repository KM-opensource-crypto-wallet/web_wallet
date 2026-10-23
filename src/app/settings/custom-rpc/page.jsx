'use client';
import {useCallback, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {selectAllCustomRpc} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSelectors';
import {deleteCustomRpc} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSlice';
import {selectVisibleWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import GeneralButton from 'components/Button';
import {PlusIcon} from 'components/Home/HomeIcons';
import Screen from 'components/Screen';
import {TrashIcon} from 'components/Transactions/TxIcons';
import {ServerIcon} from '../SettingsIcons';
import {EditIcon, MoreIcon, WalletIcon} from './RpcIcons';
import s from './CustomRpc.module.css';

import {chainLogoMap} from 'assets/chain_logo';

// Custom RPC: one glass card per chain + URL, with the wallets using it and an
// edit / delete menu.
const CustomRpc = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const allWallets = useSelector(selectVisibleWallets);
  const allCustomRpcList = useSelector(selectAllCustomRpc);

  // [anchorEl, item] for the open menu
  const [menuState, setMenuState] = useState({anchor: null, item: null});

  const groupedList = useMemo(() => {
    const items = Object.values(allCustomRpcList);
    const map = {};
    items.forEach(item => {
      const key = `${item.chain_name}__${item.customRpcUrl}`;
      if (!map[key]) {
        map[key] = {
          key,
          chain_name: item.chain_name,
          chain_display_name: item.chain_display_name,
          customRpcUrl: item.customRpcUrl,
          walletClientIds: [],
        };
      }
      map[key].walletClientIds.push(item.walletClientId);
    });
    return Object.values(map);
  }, [allCustomRpcList]);

  const openMenu = useCallback((e, item) => {
    e.stopPropagation();
    setMenuState({anchor: e.currentTarget, item});
  }, []);

  const closeMenu = useCallback(() => {
    setMenuState({anchor: null, item: null});
  }, []);

  const onMenuKeyDown = useCallback(
    e => {
      if (e.key === 'Escape') {
        menuState.anchor?.focus();
        closeMenu();
      }
    },
    [menuState.anchor, closeMenu],
  );

  const onEdit = useCallback(() => {
    const item = menuState.item;
    closeMenu();
    const params = new URLSearchParams({
      chain_name: item.chain_name,
      chain_display_name: item.chain_display_name,
      customRpcUrl: item.customRpcUrl,
      wallets: item.walletClientIds.join(','),
    });
    router.push(`/settings/add-custom-rpc?${params.toString()}`);
  }, [menuState.item, closeMenu, router]);

  const onDelete = useCallback(() => {
    const item = menuState.item;
    closeMenu();
    item.walletClientIds.forEach(walletClientId => {
      dispatch(deleteCustomRpc({chain_name: item.chain_name, walletClientId}));
    });
  }, [menuState.item, closeMenu, dispatch]);

  return (
    <Screen
      className={s.page}
      title='Custom RPC'
      right={
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Add RPC'
          onClick={() => router.push('/settings/add-custom-rpc')}>
          <PlusIcon size={22} />
        </GeneralButton>
      }>
      {/* Click-away layer for the open card menu. */}
      {menuState.item && (
        <div className={s.backdrop} aria-hidden='true' onClick={closeMenu} />
      )}

      <div className={s.column}>
        {groupedList.length === 0 ? (
          <section className={s.empty} aria-label='Custom RPC'>
            <span className={s.emptyIcon}>
              <ServerIcon size={26} />
            </span>
            <p className={s.emptyTitle}>No Custom RPC URL is available</p>
            <p className={s.emptyText}>
              Point a chain at your own node instead of the default one.
            </p>
            <GeneralButton
              fullWidth
              className={s.emptyButton}
              onClick={() => router.push('/settings/add-custom-rpc')}>
              <PlusIcon size={18} />
              Add Custom RPC
            </GeneralButton>
          </section>
        ) : (
          <section className={s.section} aria-label='Custom RPC URLs'>
            <div className={s.sectionHead}>
              <h2 className={s.sectionLabel}>Your RPC URLs</h2>
              <span className={s.count}>{groupedList.length}</span>
            </div>
            {groupedList.map(item => {
              const chainLogo = chainLogoMap[item.chain_name?.toLowerCase()];
              const walletNames = item.walletClientIds
                .map(id => allWallets?.find(w => w.clientId === id)?.walletName)
                .filter(Boolean);
              const menuOpen = menuState.item?.key === item.key;

              return (
                <article
                  key={item.key}
                  className={`${s.card} ${menuOpen ? s.cardRaised : ''}`}>
                  <div className={s.cardHead}>
                    <span className={s.chainLogo}>
                      {chainLogo ? (
                        <Image
                          src={chainLogo}
                          alt={item.chain_name}
                          width={40}
                          height={40}
                        />
                      ) : (
                        <ServerIcon size={19} />
                      )}
                    </span>
                    <p className={s.chainName}>{item.chain_display_name}</p>
                    <button
                      type='button'
                      className={s.menuTrigger}
                      aria-label={`Options for ${item.chain_display_name}`}
                      aria-haspopup='menu'
                      aria-expanded={menuOpen}
                      onClick={e => openMenu(e, item)}>
                      <MoreIcon size={20} />
                    </button>

                    {menuOpen && (
                      <div
                        className={s.menu}
                        role='menu'
                        onKeyDown={onMenuKeyDown}>
                        <button
                          type='button'
                          role='menuitem'
                          autoFocus
                          className={s.menuItem}
                          onClick={onEdit}>
                          <EditIcon size={17} />
                          Edit
                        </button>
                        <button
                          type='button'
                          role='menuitem'
                          className={`${s.menuItem} ${s.menuItemDanger}`}
                          onClick={onDelete}>
                          <TrashIcon size={17} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <p className={s.rpcUrl}>{item.customRpcUrl}</p>

                  {walletNames.length > 0 && (
                    <div className={s.walletRow}>
                      <WalletIcon size={14} className={s.walletIcon} />
                      <p className={s.walletNames}>{walletNames.join(' · ')}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </Screen>
  );
};

export default CustomRpc;
