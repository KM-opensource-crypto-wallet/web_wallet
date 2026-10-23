'use client';
import {walletRoutes} from 'utils/routes';
import styles from './VerifyCreate.module.css';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import React from 'react';
import {useSelector} from 'react-redux';
import {selectAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import GeneralButton from 'components/Button';
import Screen from 'components/Screen';
import {InfoIcon, KeyIcon} from 'components/Home/HomeIcons';

const VerifyCreate = () => {
  const router = useRouter();
  // Wallet to back up - always the wallet named in the URL (may not be the
  // currently active wallet, e.g. backing up another wallet from its Edit screen)
  const {clientId} = useParams();

  const allWallets = useSelector(selectAllWallets);
  const targetWallet = allWallets?.find(item => item?.clientId === clientId);
  const searchParams = useSearchParams();
  const hideButton = searchParams.get('showSeedPhrase');

  // Wallet not loaded yet, or not found: the wallet layout redirects to Home.
  if (!targetWallet) {
    return null;
  }

  // Wallets imported with a private key never store a phrase, so there is
  // nothing to show or back up - explain that instead of a blank page.
  if (!targetWallet.phrase) {
    return (
      <Screen
        className={styles.page}
        topBarClassName={styles.topBar}
        title='Your seed phrase'
        subtitle={targetWallet.walletName}>
        <div className={styles.column}>
          <div className={styles.intro}>
            <span className={styles.introIcon} aria-hidden='true'>
              <KeyIcon size={22} />
            </span>
            <p className={styles.introTitle}>No seed phrase for this wallet</p>
            <p className={styles.introText}>
              {targetWallet.isImportWalletWithPrivateKey
                ? 'This wallet was imported with a private key, so it has no seed phrase. Keep your private key backed up instead.'
                : "This wallet's seed phrase isn't available on this device."}
            </p>
          </div>
        </div>
      </Screen>
    );
  }

  const words = targetWallet.phrase.split(' ');
  return (
    <Screen
      className={styles.page}
      topBarClassName={styles.topBar}
      title='Your seed phrase'
      subtitle={targetWallet.walletName}>
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
    </Screen>
  );
};

export default VerifyCreate;
