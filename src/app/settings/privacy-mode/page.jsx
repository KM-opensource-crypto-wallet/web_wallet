'use client';

import React from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {
  selectAllWallets,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {togglePrivacyMode} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import Image from 'next/image';
import s from './privacy-mode.module.css';
import {Switch} from '@mui/material';
import GoBackButton from 'components/GoBackButton';
const logo = require(`assets/images/sidebarIcons/LogoSingle.svg`).default;

const PrivacyMode = () => {
  const currentWalletName = useSelector(selectCurrentWallet)?.walletName;
  const allWallets = useSelector(selectAllWallets);
  const dispatch = useDispatch();

  return (
    <div className={s.container}>
      <GoBackButton />
      <div className={s.walletSection}>
        <p className={s.title}>
          {'When you enable Privacy Mode for your wallet:\n' +
            '\t• The addresses for all coins in the wallet will automatically reset to the default address each time you restart the app.\n' +
            '\t• This ensures enhanced privacy and security for your transactions.'}
        </p>
        <ul>
          {allWallets.map(item => {
            return (
              <li className={s.walletBox} key={`pm_wallet_${item.walletName}`}>
                <div className={s.walletList}>
                  <div className={s.avatarWrapper}>
                    <Image
                      className={s.avatarAvatar}
                      alt='avatar'
                      width={54}
                      height={54}
                      src={logo}
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
                  checked={!!item.privacyMode}
                  onChange={() => {
                    dispatch(togglePrivacyMode({walletIndex: index}));
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

export default PrivacyMode;
