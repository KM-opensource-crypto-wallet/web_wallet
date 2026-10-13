'use client';
import React, {useState} from 'react';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useSelector} from 'react-redux';
import {selectCurrentWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {chainLogoMap} from 'assets/chain_logo';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';
import MadalWalletConnect from 'components/MadalWalletConnect';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon, PlusIcon, UnlinkIcon} from 'components/Home/HomeIcons';
import {ExternalLinkIcon} from 'components/Transactions/TxIcons';
import useWalletConnectSessions from 'src/hooks/walletConnect/useWalletConnectSessions';
import styles from './WalletConnect.module.css';

const WalletConnectImage = require(`assets/images/WalletConnect.png`).default;

const hostOf = url => {
  try {
    return new URL(url).host;
  } catch (e) {
    return url || '';
  }
};

// WalletConnect: start a new dApp connection, and see / disconnect the apps
// already connected to this wallet.
const WalletConnect = () => {
  const router = useRouter();
  const currentWallet = useSelector(selectCurrentWallet);
  const [modalOpen, setModalOpen] = useState(false);
  const {sessions, disconnect, isDisconnecting} = useWalletConnectSessions();

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
          <h1 className={styles.title}>WalletConnect</h1>
          {currentWallet?.walletName ? (
            <span className={styles.subtitle}>{currentWallet.walletName}</span>
          ) : null}
        </div>
        <GeneralButton
          variant='unstyled'
          className={styles.iconButton}
          aria-label='New connection'
          onClick={() => setModalOpen(true)}>
          <PlusIcon size={22} />
        </GeneralButton>
      </div>

      <div className={styles.column}>
        <section className={styles.hero} aria-label='Connect a dApp'>
          <span className={styles.heroLogo}>
            <Image src={WalletConnectImage} alt='' width={56} height={56} />
          </span>
          <h2 className={styles.heroTitle}>Connect to dApps</h2>
          <p className={styles.heroText}>
            Use this wallet on decentralised apps. You approve every connection
            and transaction here first.
          </p>
          <GeneralButton
            fullWidth
            className={styles.heroButton}
            onClick={() => setModalOpen(true)}>
            <PlusIcon size={18} />
            New connection
          </GeneralButton>
        </section>

        <section className={styles.section} aria-label='Connected apps'>
          <div className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Connected apps</span>
            {sessions.length ? (
              <span className={styles.count}>{sessions.length}</span>
            ) : null}
          </div>

          {sessions.length ? (
            sessions.map((item, index) => {
              const metadata = item?.peer?.metadata;
              const icon = metadata?.icons?.[0] || '';
              const chains = Array.isArray(item?.chainData)
                ? item.chainData
                : [];
              const busy = isDisconnecting(item.pairingTopic);
              return (
                <article
                  key={`${item.key || item.topic}${index}`}
                  className={styles.app}>
                  <div className={styles.appHead}>
                    <span className={styles.appIcon}>
                      {icon ? (
                        <Image src={icon} alt='' width={44} height={44} />
                      ) : (
                        (metadata?.name || '?')[0]
                      )}
                    </span>
                    <span className={styles.appText}>
                      <span className={styles.appName}>
                        {metadata?.name || 'Unknown app'}
                      </span>
                      {metadata?.url ? (
                        <a
                          className={styles.appUrl}
                          href={metadata.url}
                          target='_blank'
                          rel='noopener noreferrer'>
                          {hostOf(metadata.url)}
                          <ExternalLinkIcon size={12} />
                        </a>
                      ) : null}
                    </span>
                    <span className={styles.liveDot} title='Connected' />
                  </div>

                  {chains.length ? (
                    <div className={styles.chains}>
                      {chains.map((chain, i) => {
                        const logo =
                          chainLogoMap[chain?.chain_name?.toLowerCase()] ||
                          chain?.icon ||
                          null;
                        return (
                          <div
                            key={`${chain?._id || chain?.chain_name}${i}`}
                            className={styles.chain}>
                            <span className={styles.chainLogo}>
                              {logo ? (
                                <Image
                                  src={logo}
                                  alt=''
                                  width={26}
                                  height={26}
                                />
                              ) : null}
                            </span>
                            <span className={styles.chainName}>
                              {chain?.chain_display_name}
                            </span>
                            <span
                              className={styles.chainAddress}
                              title={chain?.address}>
                              {getCustomizePublicAddress(chain?.address)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <button
                    type='button'
                    className={styles.disconnect}
                    disabled={busy}
                    onClick={() =>
                      disconnect(item.pairingTopic, item.topic).then()
                    }>
                    {busy ? (
                      <span className={styles.spinner} aria-hidden='true' />
                    ) : (
                      <UnlinkIcon size={16} />
                    )}
                    {busy ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </article>
              );
            })
          ) : (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No connected apps</p>
              <p className={styles.emptyText}>
                Apps you connect with WalletConnect will show up here.
              </p>
            </div>
          )}
        </section>
      </div>

      <MadalWalletConnect visible={modalOpen} onClose={setModalOpen} />
    </main>
  );
};

export default WalletConnect;
