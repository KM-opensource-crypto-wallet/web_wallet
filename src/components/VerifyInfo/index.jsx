import {walletRoutes} from 'utils/routes';
import React, {useState} from 'react';
import {useSelector} from 'react-redux';
import styles from './VerifyInfoModal.module.css';
import Modal from '@mui/material/Modal';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

const Icon = ({children, size = 20}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'>
    {children}
  </svg>
);

// Shown on Home after a wallet is created: back up the seed phrase now or
// later. Both actions unlock once "I understand" is ticked. Bottom sheet on
// phones, centred dialog from 600px up (same look as SeedPhraseInfoModal).
export const VerifyInfoModal = ({visible, onClose}) => {
  const [infoCheck, setInfoCheck] = useState(false);
  const router = useRouter();
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);

  return (
    <Modal
      open={visible}
      onClose={() => onClose(false)}
      aria-labelledby='verify-info-title'
      aria-describedby='verify-info-description'
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <div className={styles.iconTile}>
            <Icon size={26}>
              <path d='M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z' />
              <path d='M12 8v4' />
              <path d='M12 16h.01' />
            </Icon>
          </div>
          <h2 id='verify-info-title' className={styles.title}>
            Back up your seed phrase
          </h2>
        </div>

        <ul id='verify-info-description' className={styles.points}>
          <li>
            <span className={styles.tile}>
              <Icon>
                <path d='M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zm0 0L15.5 7.5m3 3L21 8m-3-3 3 3' />
              </Icon>
            </span>
            <p>
              <strong>Your account is ready.</strong> We used a seed phrase to
              create the private key that controls your funds.
            </p>
          </li>
          <li>
            <span className={styles.tile}>
              <Icon>
                <path d='M12 20h9' />
                <path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' />
              </Icon>
            </span>
            <p>
              <strong>Keep it somewhere safe,</strong> outside of this device.{' '}
              <Link
                href='/verify/learn'
                target='_blank'
                className={styles.learn}>
                Learn more
              </Link>
            </p>
          </li>
        </ul>

        <div className={styles.warning} role='note'>
          <span className={`${styles.tile} ${styles.danger}`}>
            <Icon>
              <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
              <path d='M12 9v4' />
              <path d='M12 17h.01' />
            </Icon>
          </span>
          <p>
            <strong>We don&apos;t keep your private key.</strong> It is
            encrypted and stored on this device. If you lose it, the seed phrase
            is the only way to restore access to your funds.
          </p>
        </div>

        <label className={styles.check}>
          <input
            type='checkbox'
            checked={infoCheck}
            onChange={e => setInfoCheck(e.target.checked)}
          />
          <span className={styles.box} aria-hidden='true'>
            <Icon size={14}>
              <path d='M5 12l5 5L20 7' />
            </Icon>
          </span>
          I understand
        </label>

        <div className={styles.actions}>
          <button
            type='button'
            disabled={!infoCheck}
            className={styles.button}
            onClick={() => {
              onClose();
              router.push(walletRoutes.verifyCreate(currentWalletClientId));
            }}>
            Verify seed phrase
          </button>
          <button
            type='button'
            disabled={!infoCheck}
            className={styles.later}
            onClick={() => {
              router.push(walletRoutes.home(currentWalletClientId));
              onClose();
            }}>
            Do it later
          </button>
        </div>
      </div>
    </Modal>
  );
};
