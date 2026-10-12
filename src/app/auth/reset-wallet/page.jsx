'use client';
import React from 'react';
import Image from 'next/image';
import useResetWallet from 'src/hooks/auth/resetWallet/useResetWallet';
import AuthLayout, {
  InfoNote,
  NonCustodialNote,
  authStyles,
} from 'components/AuthLayout';
import SeedPhraseInfoModal from 'components/SeedPhraseInfoModal';
import GeneralButton from 'src/components/Button';
import styles from './SetupWallet.module.css';

const COIN = {
  btc: 'https://assets.kimlgrow.com/common/btc.png',
  eth: 'https://assets.kimlgrow.com/common/eth.webp',
  sol: 'https://assets.kimlgrow.com/common/solana.png',
  usdt: 'https://assets.kimlgrow.com/common/USDT.png',
};

const Coin = ({src, className}) => (
  <Image
    src={src}
    alt=''
    width={24}
    height={24}
    className={`${styles.coin} ${className}`}
  />
);

// A new wallet with two seed-phrase cards above it.
const CreateArt = () => (
  <div className={`${styles.tile} ${styles.tileCreate}`} aria-hidden='true'>
    <svg
      className={styles.tileArt}
      width='56'
      height='56'
      viewBox='0 0 64 64'
      fill='none'>
      <rect
        x='17'
        y='5'
        width='27'
        height='15'
        rx='3'
        transform='rotate(-8 30 13)'
        className={styles.fillSoft}
        stroke='#1A1613'
        strokeWidth='2.5'
      />
      <rect
        x='21'
        y='8'
        width='24'
        height='13'
        rx='3'
        transform='rotate(5 33 14)'
        fill='#fff'
        stroke='#1A1613'
        strokeWidth='2.5'
      />
      <rect
        x='6'
        y='19'
        width='52'
        height='35'
        rx='9'
        fill='#fff'
        stroke='#1A1613'
        strokeWidth='3'
      />
      <path
        d='M58 29.5 H47 a7.5 7.5 0 0 0 0 15 h11 z'
        className={styles.fillSoft}
        stroke='#1A1613'
        strokeWidth='3'
        strokeLinejoin='round'
      />
      <circle cx='48.5' cy='37' r='3' className={styles.fillAccent} />
    </svg>
    <Coin src={COIN.btc} className={styles.coinTopLeft} />
    <Coin src={COIN.eth} className={styles.coinBottomRight} />
    <span className={styles.plus}>
      <svg
        width='12'
        height='12'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='3'
        strokeLinecap='round'>
        <path d='M12 5v14' />
        <path d='M5 12h14' />
      </svg>
    </span>
  </div>
);

// A wallet with an arrow coming in.
const ImportArt = () => (
  <div className={`${styles.tile} ${styles.tileImport}`} aria-hidden='true'>
    <svg
      className={styles.tileArt}
      width='56'
      height='56'
      viewBox='0 0 64 64'
      fill='none'>
      <path
        d='M32 3v13'
        className={styles.strokeArrow}
        strokeWidth='3.5'
        strokeLinecap='round'
      />
      <path
        d='M25.5 10.5 32 17l6.5-6.5'
        className={styles.strokeArrow}
        strokeWidth='3.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <rect
        x='6'
        y='21'
        width='52'
        height='34'
        rx='9'
        className={styles.fillAccent}
        stroke='#1A1613'
        strokeWidth='3'
      />
      <path
        d='M58 31 H47 a7.5 7.5 0 0 0 0 15 h11 z'
        fill='#fff'
        stroke='#1A1613'
        strokeWidth='3'
        strokeLinejoin='round'
      />
      <circle cx='48.5' cy='38.5' r='3' fill='#1A1613' />
    </svg>
    <Coin src={COIN.sol} className={styles.coinTopLeft} />
    <Coin src={COIN.usdt} className={styles.coinBottomRight} />
  </div>
);

// `busy`: this option was picked and its page is still loading.
const Option = ({art, title, text, busy, disabled, onClick}) => (
  <GeneralButton
    variant='unstyled'
    className={`${styles.option} ${busy ? styles.optionBusy : ''}`}
    aria-busy={busy || undefined}
    disabled={disabled}
    onClick={onClick}>
    {art}
    <span className={styles.optionText}>
      <span className={styles.optionTitle}>{title}</span>
      <span className={styles.optionBody}>{text}</span>
    </span>
    {busy ? (
      <span className={styles.spinner} aria-hidden='true' />
    ) : (
      <svg
        className={styles.chevron}
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2.2'
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'>
        <path d='M9 6l6 6-6 6' />
      </svg>
    )}
  </GeneralButton>
);

const ResetWallet = () => {
  const {
    infoOpen,
    openInfo,
    closeInfo,
    isNavigating,
    isCreateBusy,
    isImportBusy,
    goToCreate,
    goToImport,
  } = useResetWallet();

  return (
    <>
      <AuthLayout
        title='Set up your wallet'
        subtitle={
          <>
            We&apos;ll generate a 12-word seed phrase — the master key to your
            wallet. Keep it safe: it&apos;s the only way to restore your funds.{' '}
            <GeneralButton
              variant='unstyled'
              className={styles.learnMore}
              onClick={openInfo}>
              Learn more
            </GeneralButton>
          </>
        }>
        <div className={styles.options}>
          <Option
            art={<CreateArt />}
            title='Create a new wallet'
            text='Generate a brand-new wallet with a fresh 12-word seed phrase.'
            busy={isCreateBusy}
            disabled={isNavigating}
            onClick={goToCreate}
          />
          <Option
            art={<ImportArt />}
            title='Import a wallet'
            text='Restore an existing wallet using your seed phrase or private key.'
            busy={isImportBusy}
            disabled={isNavigating}
            onClick={goToImport}
          />
        </div>

        <InfoNote>
          Your seed phrase is generated and stored only on this device. We never
          see it.
        </InfoNote>

        <div className={authStyles.footer}>
          <NonCustodialNote />
        </div>
      </AuthLayout>

      <SeedPhraseInfoModal visible={infoOpen} onClose={closeInfo} />
    </>
  );
};

export default ResetWallet;
