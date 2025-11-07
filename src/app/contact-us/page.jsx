'use client';
import React, {useCallback, useContext} from 'react';
import Image from 'next/image';
import WalletConnectItem from 'components/WalletConnectItem';
import styles from './ContactUs.module.css';
import {toast} from 'react-toastify';
import {
  getAppName,
  getAppAssets,
  getContactUsEmail,
} from 'src/whitelabel/whiteLabelInfo';
import {ThemeContext} from 'theme/ThemeContext';
import {useSelector} from 'react-redux';
import {currencySymbol} from 'data/currency';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import cards from 'data/cards';
import {useRouter} from 'next/navigation';

const ContactUs = () => {
  const router = useRouter();
  const {themeType} = useContext(ThemeContext);
  const localCurrency = useSelector(getLocalCurrency);

  const handleContactViaEmail = useCallback(() => {
    try {
      window.open(`mailto:${getContactUsEmail()}`);
    } catch (e) {
      console.error('error in open emails', e);
      toast.error(`Couldn't open an email client`);
    }
  }, []);

  const onPressContactViaTelegram = useCallback(() => {
    try {
      window.open('https://t.me/dokwallet');
    } catch (e) {
      console.error('error in open Telegram', e);
      toast.error(`Couldn't open a telegram`);
    }
  }, []);

  const handleOTCClick = useCallback(() => {
    router.push('/contact-us/otc');
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.contentContainerStyle}>
        <div className={styles.title}>
          Have questions or feedback? Reach out to us! Our team is here to
          assist you with any inquiries. Contact us today, and we&apos;ll be in
          touch shortly.
        </div>
        <div className={styles.btnWrapper}>
          <button className={styles.button} onClick={handleContactViaEmail}>
            <div className={styles.buttonTitle}>{'Contact via Email'}</div>
          </button>
        </div>
        {getAppName() === 'dokwallet' && (
          <>
            <div className={styles.descriptions}>{'OR'}</div>
            <div className={styles.btnWrapper}>
              <button
                className={styles.button}
                onClick={onPressContactViaTelegram}>
                <div className={styles.buttonTitle}>
                  {'Contact via Telegram'}
                </div>
              </button>
            </div>
          </>
        )}
        <div className={styles.borderView} />
        {/* --- OTC Card --- */}
        <div style={{display: 'flex', justifyContent: 'center', marginTop: 30}}>
          <button className={styles.cardBox} onClick={handleOTCClick}>
            <div className={styles.cardItemContainer}>
              <Image
                src={
                  getAppAssets()?.['buy_card_2']?.[themeType] || cards[1].src
                }
                alt="OTC"
                className={styles.cardItem}
                width={160}
                height={90}
              />
              <div className={styles.textContainer}>
                <p className={styles.cardTitle}>OTC</p>
                <p className={styles.cardDescription}>
                  (Must be over {currencySymbol[localCurrency]}10000)
                </p>
              </div>
            </div>
          </button>
        </div>

        <WalletConnectItem />
      </div>
    </div>
  );
};

export default ContactUs;
