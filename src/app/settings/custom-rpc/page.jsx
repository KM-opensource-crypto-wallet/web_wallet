'use client';
import {useCallback, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {Menu, MenuItem} from '@mui/material';
import {selectAllCustomRpc} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSelectors';
import {deleteCustomRpc} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSlice';
import {selectAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import GoBackButton from 'components/GoBackButton';
import s from './CustomRpc.module.css';

import aptosLogo from 'assets/chain_logo/aptos.png';
import arbitrumLogo from 'assets/chain_logo/arbitrum.png';
import avalancheLogo from 'assets/chain_logo/avalanche.png';
import baseLogo from 'assets/chain_logo/base.png';
import binanceSmartChainLogo from 'assets/chain_logo/binance_smart_chain.png';
import cosmosLogo from 'assets/chain_logo/cosmos.png';
import ethereumLogo from 'assets/chain_logo/ethereum.png';
import ethereumClassicLogo from 'assets/chain_logo/ethereum_classic.png';
import ethereumPowLogo from 'assets/chain_logo/ethereum_pow.png';
import fantomLogo from 'assets/chain_logo/fantom.png';
import gnosisLogo from 'assets/chain_logo/gnosis.png';
import inkLogo from 'assets/chain_logo/ink.png';
import kavaLogo from 'assets/chain_logo/kava.png';
import lineaLogo from 'assets/chain_logo/linea.png';
import optimismLogo from 'assets/chain_logo/optimism.png';
import optimismBinanceSmartChainLogo from 'assets/chain_logo/optimism_binance_smart_chain.png';
import polygonLogo from 'assets/chain_logo/polygon.png';
import rippleLogo from 'assets/chain_logo/ripple.png';
import solanaLogo from 'assets/chain_logo/solana.png';
import stellarLogo from 'assets/chain_logo/stellar.png';
import tezosLogo from 'assets/chain_logo/tezos.png';
import tonLogo from 'assets/chain_logo/ton.png';
import tronLogo from 'assets/chain_logo/tron.png';
import victionLogo from 'assets/chain_logo/viction.png';
import zksyncLogo from 'assets/chain_logo/zksync.png';
import seiLogo from 'assets/chain_logo/sei.png';

const chainLogoMap = {
  aptos: aptosLogo,
  arbitrum: arbitrumLogo,
  avalanche: avalancheLogo,
  base: baseLogo,
  binance_smart_chain: binanceSmartChainLogo,
  cosmos: cosmosLogo,
  ethereum: ethereumLogo,
  ethereum_classic: ethereumClassicLogo,
  ethereum_pow: ethereumPowLogo,
  fantom: fantomLogo,
  gnosis: gnosisLogo,
  ink: inkLogo,
  kava: kavaLogo,
  linea: lineaLogo,
  optimism: optimismLogo,
  optimism_binance_smart_chain: optimismBinanceSmartChainLogo,
  polygon: polygonLogo,
  stellar: stellarLogo,
  tezos: tezosLogo,
  viction: victionLogo,
  zksync: zksyncLogo,
  sei: seiLogo,
};

const CustomRpc = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const allWallets = useSelector(selectAllWallets);
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
    <div className={s.container}>
      <GoBackButton />
      <div className={s.header}>
        <p className={s.title}>Custom RPC</p>
        <button
          className={s.addBtn}
          onClick={() => router.push('/settings/add-custom-rpc')}>
          + Add RPC
        </button>
      </div>

      {groupedList.length === 0 ? (
        <div className={s.empty}>
          <p className={s.emptyText}>No Custom RPC URL is available</p>
          <button
            className={s.emptyBtn}
            onClick={() => router.push('/settings/add-custom-rpc')}>
            Add Custom RPC
          </button>
        </div>
      ) : (
        <div className={s.list}>
          {groupedList.map(item => {
            const chainLogo = chainLogoMap[item.chain_name?.toLowerCase()];
            const walletNames = item.walletClientIds
              .map(id => allWallets?.find(w => w.clientId === id)?.walletName)
              .filter(Boolean);

            return (
              <div key={item.key} className={s.card}>
                <div className={s.cardHeader}>
                  <div className={s.chainRow}>
                    {chainLogo ? (
                      <Image
                        src={chainLogo}
                        alt={item.chain_name}
                        width={24}
                        height={24}
                        className={s.chainIcon}
                      />
                    ) : (
                      <div className={s.chainIconPlaceholder}>
                        <span className={s.globeIcon}>🌐</span>
                      </div>
                    )}
                    <p className={s.chainName}>{item.chain_display_name}</p>
                  </div>
                  <button
                    className={s.menuTrigger}
                    onClick={e => openMenu(e, item)}>
                    ⋮
                  </button>
                </div>

                <div className={s.divider} />

                <p className={s.rpcUrl}>{item.customRpcUrl}</p>

                {walletNames.length > 0 && (
                  <div className={s.walletRow}>
                    <span className={s.walletIcon}>👛</span>
                    <p className={s.walletNames}>{walletNames.join(' · ')}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Menu
        anchorEl={menuState.anchor}
        open={Boolean(menuState.anchor)}
        onClose={closeMenu}>
        <MenuItem onClick={onEdit}>
          <span className={s.menuItemEdit}>✏️ Edit</span>
        </MenuItem>
        <MenuItem onClick={onDelete}>
          <span className={s.menuItemDelete}>🗑️ Delete</span>
        </MenuItem>
      </Menu>
    </div>
  );
};

export default CustomRpc;
