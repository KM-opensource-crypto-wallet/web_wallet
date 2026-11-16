'use client';
import React, {useCallback, useContext, useEffect, useState} from 'react';
import Image from 'next/image';
import WalletConnectItem from 'components/WalletConnectItem';
import styles from './ContactUs.module.css';
import {getAppAssets} from 'src/whitelabel/whiteLabelInfo';
import {
  getSupportTelegramUrl,
  openSupportEmail,
  openSupportTelegram,
} from 'utils/contactSupport';
import {copyToClipboard} from 'utils/copyToClipboard';
import {getSupportId} from 'services/logger';
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

  // Browser-only (Sentry user), so it is read after mount to keep the server
  // and client markup identical.
  const [supportId, setSupportId] = useState('');
  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => setSupportId(getSupportId()))();
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
          <button className={styles.button} onClick={openSupportEmail}>
            <div className={styles.buttonTitle}>{'Contact via Email'}</div>
          </button>
        </div>
        {!!getSupportTelegramUrl() && (
          <>
            <div className={styles.descriptions}>{'OR'}</div>
            <div className={styles.btnWrapper}>
              <button className={styles.button} onClick={openSupportTelegram}>
                <div className={styles.buttonTitle}>
                  {'Contact via Telegram'}
                </div>
              </button>
            </div>
          </>
        )}
        {!!supportId && (
          <button
            type='button'
            className={styles.supportId}
            onClick={() => copyToClipboard(supportId, 'Support ID copied')}>
            {`Support ID: ${supportId} (tap to copy)`}
          </button>
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
                alt='OTC'
                className={styles.cardItem}
                width={160}
                height={90}
              />
              <div className={styles.textContainer}>
                <p className={styles.cardTitle}>OTC</p>
                <p className={styles.cardDescription}>
                  (Must be over {currencySymbol[localCurrency] || ''}10000)
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
