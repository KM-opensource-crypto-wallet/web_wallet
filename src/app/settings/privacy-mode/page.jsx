'use client';

import React from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {
  selectVisibleWallets,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {togglePrivacyMode} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import Image from 'next/image';
import s from './privacy-mode.module.css';
import Screen from 'components/Screen';
import {EyeOffIcon} from 'app/settings/SettingsIcons';
import {getAppIcon} from 'whitelabel/whiteLabelInfo';

const PrivacyMode = () => {
  const currentWalletName = useSelector(selectCurrentWallet)?.walletName;
  const visibleWallets = useSelector(selectVisibleWallets);
  const dispatch = useDispatch();

  return (
    <Screen className={s.page} title='Privacy Mode'>
      <div className={s.column}>
        <div className={s.info}>
          <span className={s.infoIcon}>
            <EyeOffIcon size={20} />
          </span>
          <div className={s.infoText}>
            <p className={s.infoTitle}>
              When you enable Privacy Mode for your wallet:
            </p>
            <ul className={s.bullets}>
              <li>
                The addresses for all coins in the wallet will automatically
                reset to the default address each time you restart the app.
              </li>
              <li>
                This ensures enhanced privacy and security for your
                transactions.
              </li>
            </ul>
          </div>
        </div>

        <section className={s.section} aria-label='Wallets'>
          <h2 className={s.sectionLabel}>Wallets</h2>
          <ul className={s.card}>
            {visibleWallets.map(item => {
              const isCurrent = item?.walletName === currentWalletName;
              return (
                <li className={s.row} key={`pm_wallet_${item.clientId}`}>
                  <span className={s.avatar}>
                    <Image
                      className={s.avatarImage}
                      alt=''
                      width={26}
                      height={26}
                      src={getAppIcon()}
                    />
                  </span>
                  <span className={s.rowText}>
                    <span className={s.rowTitle}>
                      <span className={s.walletName}>{item?.walletName}</span>
                      {isCurrent && <span className={s.badge}>Current</span>}
                    </span>
                    <span className={s.rowHint}>Multi-Coin Wallet</span>
                  </span>
                  <button
                    type='button'
                    role='switch'
                    aria-checked={!!item.privacyMode}
                    aria-label={`Privacy Mode for ${item?.walletName}`}
                    className={`${s.switch} ${
                      item.privacyMode ? s.switchOn : ''
                    }`}
                    onClick={() => {
                      dispatch(togglePrivacyMode({clientId: item.clientId}));
                    }}>
                    <span className={s.knob} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Screen>
  );
};

export default PrivacyMode;
