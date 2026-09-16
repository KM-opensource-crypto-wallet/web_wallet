'use client';
import React, {useContext, useCallback, useState} from 'react';
import styles from './WalletConnect.module.css';

const WalletConnectImage = require(`assets/images/WalletConnect.png`).default;
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import WalletConnectItem from 'components/WalletConnectItem';
import MadalWalletConnect from 'components/MadalWalletConnect';

const WalletConnect = () => {
  const router = useRouter();
  const [modalOpen, setModalClose] = useState(false);

  ////////////////////////////////////
  const onPressNewConnection = () => {
    // router.push(`/?connect=${true}`);
    setModalClose(true);
  };

  return (
    <>
      <div className={styles.container}>
        <Image
          src={WalletConnectImage}
          alt='connect'
          className={styles.mainImageStyle}
        />
        <button className={styles.button} onClick={onPressNewConnection}>
          {'New Connection'}
        </button>
      </div>
      <div className={styles.borderView} />
      <WalletConnectItem />
      <MadalWalletConnect visible={modalOpen} onClose={setModalClose} />
    </>
  );
};

export default WalletConnect;
