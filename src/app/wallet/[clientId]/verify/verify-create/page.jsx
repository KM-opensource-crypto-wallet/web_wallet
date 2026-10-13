'use client';
import {walletRoutes} from 'utils/routes';
import styles from './VerifyCreate.module.css';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import React from 'react';
import {useSelector} from 'react-redux';
import {selectAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon, InfoIcon, KeyIcon} from 'components/Home/HomeIcons';

const VerifyCreate = () => {
  const router = useRouter();
  // Wallet to back up - always the wallet named in the URL (may not be the
  // currently active wallet, e.g. backing up another wallet from its Edit screen)
  const {clientId} = useParams();

  const allWallets = useSelector(selectAllWallets);
  const targetWallet = allWallets?.find(item => item?.clientId === clientId);
  const searchParams = useSearchParams();
  const hideButton = searchParams.get('showSeedPhrase');

  if (!targetWallet?.phrase) {
    return;
  }
  const words = targetWallet.phrase.split(' ');
  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden='true' />
      <div className={styles.topBar}>
        <GeneralButton
          variant='unstyled'
          className={styles.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <div className={styles.heading}>
          <h1 className={styles.title}>Your seed phrase</h1>
          {targetWallet.walletName ? (
            <span className={styles.subtitle}>{targetWallet.walletName}</span>
          ) : null}
        </div>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>

      <div className={styles.column}>
        <div className={styles.intro}>
          <span className={styles.introIcon} aria-hidden='true'>
            <KeyIcon size={22} />
          </span>
          <p className={styles.introTitle}>
            Get a pen and paper before you start.
          </p>
          <p className={styles.introText}>
            Write down these {words.length} words in the right order and save
            them somewhere safe.
          </p>
        </div>

        <ol className={styles.wordsCard} aria-label='Seed phrase words'>
          {words.map((word, index) => (
            <li className={styles.wordChip} key={index}>
              <span className={styles.number}>{index + 1}</span>
              <span className={styles.word}>{word}</span>
            </li>
          ))}
        </ol>

        <div className={styles.note}>
          <InfoIcon size={18} />
          <p>
            Never share your seed phrase. Anyone with these words can take your
            funds.
          </p>
        </div>

        {!hideButton && (
          <div className={styles.footer}>
            <GeneralButton
              fullWidth
              className={styles.button}
              onClick={() => {
                router.push(walletRoutes.verifyScreen(clientId));
              }}>
              I&apos;ve written it down
            </GeneralButton>
            <p className={styles.info}>
              You will confirm this phrase on the next screen
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default VerifyCreate;
