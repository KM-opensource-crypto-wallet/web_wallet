'use client';
import React, {useCallback, useContext} from 'react';
import Image from 'next/image';
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
import GeneralButton from 'components/Button';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  UnlinkIcon,
} from 'components/Home/HomeIcons';
import {ExternalLinkIcon} from 'components/Transactions/TxIcons';
import useWalletConnectSessions from 'src/hooks/protectedRoutes/wallet/walletConnect/useWalletConnectSessions';
import {MailIcon, TelegramIcon} from './ContactIcons';

const hostOf = url => {
  try {
    return new URL(url).host;
  } catch (e) {
    return url || '';
  }
};

const ContactUs = () => {
  const router = useRouter();
  const {themeType} = useContext(ThemeContext);
  const localCurrency = useSelector(getLocalCurrency);
  const {sessions, disconnect, isDisconnecting} = useWalletConnectSessions();
  const contactEmail = getContactUsEmail();

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
        <h1 className={styles.title}>Contact us</h1>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>

      <div className={styles.column}>
        <p className={styles.lead}>
          Have questions or feedback? Reach out to us! Our team is here to
          assist you with any inquiries. Contact us today, and we&apos;ll be in
          touch shortly.
        </p>

        <section className={styles.section} aria-label='Get in touch'>
          <h2 className={styles.sectionLabel}>Get in touch</h2>
          <div className={styles.card}>
            <button
              type='button'
              className={styles.row}
              onClick={handleContactViaEmail}>
              <span className={styles.rowIcon}>
                <MailIcon size={19} />
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Contact via Email</span>
                {contactEmail ? (
                  <span className={styles.rowHint}>{contactEmail}</span>
                ) : null}
              </span>
              <ExternalLinkIcon size={16} className={styles.rowChevron} />
            </button>
            {getAppName() === 'dokwallet' && (
              <button
                type='button'
                className={styles.row}
                onClick={onPressContactViaTelegram}>
                <span className={styles.rowIcon}>
                  <TelegramIcon size={19} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>Contact via Telegram</span>
                  <span className={styles.rowHint}>t.me/dokwallet</span>
                </span>
                <ExternalLinkIcon size={16} className={styles.rowChevron} />
              </button>
            )}
          </div>
        </section>

        <section className={styles.section} aria-label='Large orders'>
          <h2 className={styles.sectionLabel}>Large orders</h2>
          <button type='button' className={styles.otc} onClick={handleOTCClick}>
            <span className={styles.otcArt}>
              <Image
                src={
                  getAppAssets()?.['buy_card_2']?.[themeType] || cards[1].src
                }
                alt=''
                width={160}
                height={90}
              />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>OTC</span>
              <span className={styles.rowHint}>
                Must be over {currencySymbol[localCurrency] || ''}10000
              </span>
            </span>
            <ChevronRightIcon size={17} className={styles.rowChevron} />
          </button>
        </section>

        {sessions.length ? (
          <section className={styles.section} aria-label='Connected apps'>
            <h2 className={styles.sectionLabel}>Connected apps</h2>
            <div className={styles.card}>
              {sessions.map((item, index) => {
                const metadata = item?.peer?.metadata;
                const icon = metadata?.icons?.[0] || '';
                const chainCount = Array.isArray(item?.chainData)
                  ? item.chainData.length
                  : 0;
                const busy = isDisconnecting(item.pairingTopic);
                return (
                  <div
                    key={`${item.key || item.topic}${index}`}
                    className={styles.row}>
                    <span className={styles.appIcon}>
                      {icon ? (
                        <Image src={icon} alt='' width={38} height={38} />
                      ) : (
                        (metadata?.name || '?')[0]
                      )}
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>
                        {metadata?.name || 'Unknown app'}
                      </span>
                      <span className={styles.rowHint}>
                        {hostOf(metadata?.url)}
                        {chainCount
                          ? ` · ${chainCount} chain${chainCount > 1 ? 's' : ''}`
                          : ''}
                      </span>
                    </span>
                    <button
                      type='button'
                      className={styles.disconnect}
                      disabled={busy}
                      aria-label={`Disconnect ${metadata?.name || 'app'}`}
                      onClick={() =>
                        disconnect(item.pairingTopic, item.topic).then()
                      }>
                      {busy ? (
                        <span className={styles.spinner} aria-hidden='true' />
                      ) : (
                        <UnlinkIcon size={15} />
                      )}
                      <span>{busy ? 'Disconnecting…' : 'Disconnect'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default ContactUs;
