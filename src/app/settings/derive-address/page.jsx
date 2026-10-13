'use client';

import React from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useRouter} from 'next/navigation';
import {
  selectVisibleWallets,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  addEVMAndTronDeriveAddresses,
  removeEVMDeriveAddresses,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import Image from 'next/image';
import s from './DeriveAddress.module.css';
import GeneralButton from 'components/Button';
import {CheckIcon, ChevronLeftIcon} from 'components/Home/HomeIcons';
import {BranchesIcon} from '../SettingsIcons';
import {getAppIcon} from 'whitelabel/whiteLabelInfo';

// Derive addresses: one switch per wallet that adds or removes the extra
// EVM, SOL and TRX addresses.
const DeriveAddress = () => {
  const router = useRouter();
  const currentWalletName = useSelector(selectCurrentWallet)?.walletName;
  const visibleWallets = useSelector(selectVisibleWallets);
  const dispatch = useDispatch();

  const onToggle = (item, value) => {
    if (value) {
      dispatch(
        addEVMAndTronDeriveAddresses({
          clientId: item.clientId,
          wallet: item,
        }),
      );
    } else {
      dispatch(removeEVMDeriveAddresses({clientId: item.clientId}));
    }
  };

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <h1 className={s.title}>EVM, SOL &amp; TRX addresses</h1>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>

      <div className={s.column}>
        <div className={s.intro}>
          <span className={s.introIcon}>
            <BranchesIcon size={19} />
          </span>
          <p className={s.introText}>
            Add or remove derive addresses for all EVM, SOL and TRX
          </p>
        </div>

        <section className={s.section} aria-label='Wallets'>
          <h2 className={s.sectionLabel}>Wallets</h2>
          <ul className={s.card}>
            {visibleWallets.map(item => {
              const checked = !!item.isEVMAddressesAdded;
              const isCurrent = item?.walletName === currentWalletName;
              return (
                <li className={s.row} key={`dp_wallet_${item.clientId}`}>
                  <span className={s.avatar}>
                    <Image
                      alt='avatar'
                      width={26}
                      height={26}
                      src={getAppIcon()}
                    />
                    {isCurrent && (
                      <span className={s.badge} title='Current wallet'>
                        <CheckIcon size={9} />
                      </span>
                    )}
                  </span>

                  <span className={s.rowText}>
                    <span className={s.rowTitle}>{item?.walletName}</span>
                    <span className={s.rowHint}>Multi-Coin Wallet</span>
                  </span>

                  <button
                    type='button'
                    role='switch'
                    aria-checked={checked}
                    aria-label={`Derive addresses for ${item?.walletName}`}
                    className={`${s.switch} ${checked ? s.switchOn : ''}`}
                    onClick={() => onToggle(item, !checked)}>
                    <span className={s.knob} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
};

export default DeriveAddress;
