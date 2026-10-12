import React from 'react';
import Modal from '@mui/material/Modal';
import {isBackupRestoreEnabled} from 'whitelabel/whiteLabelInfo';
import styles from './SeedPhraseInfoModal.module.css';

const Icon = ({children}) => (
  <svg
    width='20'
    height='20'
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

// "Learn more" on the wallet setup screen: what a seed phrase is and how to
// keep it. Bottom sheet on phones, centred dialog from 600px up.
const SeedPhraseInfoModal = ({visible, onClose}) => (
  <Modal
    open={visible}
    onClose={onClose}
    aria-labelledby='seed-info-title'
    slotProps={{backdrop: {className: styles.backdrop}}}>
    <div className={styles.sheet}>
      <div className={styles.handle} />
      <h2 id='seed-info-title' className={styles.title}>
        What is a seed phrase?
      </h2>
      <ul className={styles.points}>
        <li>
          <span className={styles.tile}>
            <Icon>
              <path d='M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zm0 0L15.5 7.5m3 3L21 8m-3-3 3 3' />
            </Icon>
          </span>
          <p>
            <strong>It&apos;s the master key.</strong> 12 words that can rebuild
            your entire wallet — every coin and address — on any device.
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
            <strong>Write it down, keep it offline.</strong> Paper or steel
            beats screenshots.
            {isBackupRestoreEnabled()
              ? ' You can also keep an encrypted backup in your own Google Drive.'
              : null}
          </p>
        </li>
        <li>
          <span className={`${styles.tile} ${styles.danger}`}>
            <Icon>
              <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
              <line x1='12' y1='9' x2='12' y2='13' />
              <line x1='12' y1='17' x2='12.01' y2='17' />
            </Icon>
          </span>
          <p>
            <strong>Anyone with these words owns your funds.</strong> Never
            share them — we will never ask for them.
          </p>
        </li>
        <li>
          <span className={styles.tile}>
            <Icon>
              <rect x='4' y='10' width='16' height='10' rx='2' />
              <path d='M8 10V7a4 4 0 0 1 8 0v3' />
            </Icon>
          </span>
          <p>
            <strong>It stays on this device.</strong> It is generated and stored
            locally — we never see it.
          </p>
        </li>
      </ul>
      <button type='button' className={styles.button} onClick={onClose}>
        Got it
      </button>
    </div>
  </Modal>
);

export default SeedPhraseInfoModal;
