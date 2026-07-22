'use client';

import React from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {
  selectVisibleWalletsWithIndex,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  addEVMAndTronDeriveAddresses,
  removeEVMDeriveAddresses,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import Image from 'next/image';
import s from './DeriveAddress.module.css';
import {Switch} from '@mui/material';
import GoBackButton from 'components/GoBackButton';
import {getAppIcon} from 'whitelabel/whiteLabelInfo';

const DeriveAddress = () => {
  const currentWalletName = useSelector(selectCurrentWallet)?.walletName;
  const visibleWallets = useSelector(selectVisibleWalletsWithIndex);
  const dispatch = useDispatch();

  return (
    <div className={s.container}>
      <GoBackButton />
      <div className={s.walletSection}>
        <p className={s.title}>
          Add or remove derive addresses for all EVM, SOL and TRX
        </p>
        <ul>
          {visibleWallets.map(({wallet: item, index}) => {
            return (
              <li className={s.walletBox} key={`dp_wallet_${item.walletName}`}>
                <div className={s.walletList}>
                  <div className={s.avatarWrapper}>
                    <Image
                      className={s.avatarAvatar}
                      alt='avatar'
                      width={54}
                      height={54}
                      src={getAppIcon()}
                    />

                    {item?.walletName === currentWalletName && (
                      <span className={s.badge}>&#10004;</span>
                    )}
                  </div>

                  <div className={s.textContainer}>
                    <p className={s.mainText}>{item?.walletName}</p>
                    <p className={s.secondaryText}>Multi-Coin Wallet</p>
                  </div>
                </div>
                <Switch
                  checked={!!item.isEVMAddressesAdded}
                  onChange={e => {
                    const value = e.target.checked;
                    if (value) {
                      dispatch(
                        addEVMAndTronDeriveAddresses({index, wallet: item}),
                      );
                    } else {
                      dispatch(removeEVMDeriveAddresses({index}));
                    }
                  }}
                  color='warning'
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default DeriveAddress;
