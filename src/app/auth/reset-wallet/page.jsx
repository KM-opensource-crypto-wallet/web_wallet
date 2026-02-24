'use client';
import styles from './ResetWallet.module.css';
import React, {useContext, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {getAppAssets} from 'whitelabel/whiteLabelInfo';
import {ThemeContext} from 'theme/ThemeContext';
import CreateWalletSVG from 'assets/images/icons/create_wallet.svg';
import ImportWalletSVG from 'assets/images/icons/import_wallet.svg';

// import { loadingOn } from "redux/auth/authSlice";
// import { ThemeContext } from "../../../../ThemeContext";
// import { useDispatch } from "redux/utils/useDispatch";

const ResetWallet = () => {
  const router = useRouter();
  const [modal, setModal] = useState(true);
  const {themeType} = useContext(ThemeContext);
  const searchParams = useSearchParams();

  // const { theme } = useContext(ThemeContext);
  // const styles = myStyles(theme);
  // const isFromOnBoarding = route?.params?.isFromOnBoarding;
  // const dispatch = useDispatch("ResetWallet");
  // console.log("is from onboard", isFromOnBoarding);

  // useLayoutEffect(() => {
  //   console.log("is from onboard2", isFromOnBoarding);
  //   if (isFromOnBoarding) {
  //     navigation.setOptions({
  //       headerShown: false,
  //     });
  //   } else {
  //     navigation.setOptions({
  //       headerShown: true,
  //     });
  //   }
  // }, [isFromOnBoarding]);

  ///////////////////////////

  return (
    <>
      <div className={styles.container}>
        <div className={styles.infoList}>
          <p className={styles.titleInfo}>Set up</p>
          <p className={styles.titleInfo}>your Wallet </p>
          <p className={styles.info}>
            {
              'A cryptocurrency wallet is simply a virtual wallet used to send, receive and store digital assets such as Bitcoin, Ethereum, BNB and Solana, among others.'
            }
          </p>
          <p className={styles.info}>
            To set up a wallet, we will generate a seed phrase for you,
            consisting of 12 unique words. It is very important that you store
            your seed phrase in a safe place.
          </p>

          <span className={styles.learnText}>
            <Link href={'/auth/learn-reset'} target='_blank'>
              Learn more
            </Link>
          </span>

          <div className={styles.btnList}>
            <button
              onClick={() => {
                router.push(
                  `/auth/create-wallet${
                    searchParams ? `?${searchParams}` : ''
                  }`,
                );
              }}
              className={styles.btn}>
              <div>
                {getAppAssets()?.[`wallet_create`]?.[themeType] ? (
                  <Image
                    src={getAppAssets()?.[`wallet_create`]?.[themeType]}
                    width={150}
                    height={150}
                    alt={'create-wallet'}
                  />
                ) : (
                  <CreateWalletSVG />
                )}
              </div>
              <div className={styles.textBox}>
                <p style={{color: 'var(--font)'}}>Create</p>
                <p style={{color: 'var(--backgroundColor)'}}>Wallet</p>
              </div>
            </button>

            <button
              onClick={() =>
                router.push(
                  `/auth/import-wallet${
                    searchParams ? `?${searchParams}` : ''
                  }`,
                )
              }
              className={styles.btn}>
              <div className={styles.icon_create}>
                {getAppAssets()?.[`wallet_import`]?.[themeType] ? (
                  <Image
                    src={getAppAssets()?.[`wallet_import`]?.[themeType]}
                    width={150}
                    height={150}
                    alt={'create-wallet'}
                  />
                ) : (
                  <ImportWalletSVG />
                )}
              </div>
              <div className={styles.textBox2}>
                <p
                  style={{
                    color: 'var(--background)',
                  }}>
                  Import
                </p>
                <p
                  style={{
                    color: 'var(--backgroundColor)',
                  }}>
                  Wallet
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetWallet;
