'use client';
import styles from './VerifyCreate.module.css';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import React from 'react';
import GoBackButton from 'components/GoBackButton';
import {useSelector} from 'react-redux';
import {selectAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

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
  const words = targetWallet.phrase.split(' ').map(w => ({word: w}));
  return (
    <div className={styles.container}>
      <div className={styles.goBack}>
        <GoBackButton />
      </div>
      <div>
        <p className={styles.title}>Your{'\n'}seed phrase</p>
        <p className={styles.textFirst}>
          Get a pen and paper before you start.
        </p>
        <p className={styles.text}>
          Write down these words in the right order and save them somewhere
          safe.
        </p>
      </div>
      <div className={styles.wordsList}>
        {words.map((item, index) => (
          <div className={styles.wordsBox} key={index}>
            <p className={styles.number}>{index + 1}</p>
            <p className={styles.word}>{item.word}</p>
          </div>
        ))}
      </div>
      {!hideButton && (
        <div>
          <button
            className={styles.btn}
            onClick={() => {
              router.push(`/wallet/${clientId}/verify/verify-screen`);
            }}>
            I`ve written it down
          </button>
          <p className={styles.info}>
            You will confirm this phrase on the next screen
          </p>
        </div>
      )}
    </div>
  );
};

export default VerifyCreate;
