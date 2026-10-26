'use client';
import React from 'react';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import shell from 'components/ModalReset/ModalReset.module.css';
import styles from './DuplicateTransactionModal.module.css';

// Blocks a repeat of a transaction that may already have gone through. Only
// "I Understand" dismisses it (no backdrop / Esc close). Bottom sheet on
// phones, centred dialog from 600px up.
const DuplicateTransactionModal = ({visible, onClose}) => {
  return (
    <Modal
      open={visible}
      onClose={() => {}}
      aria-labelledby='duplicate-transaction-modal-title'
      aria-describedby='duplicate-transaction-modal-description'
      slotProps={{backdrop: {className: shell.backdrop}}}>
      <div className={shell.sheet}>
        <div className={shell.handle} />
        <span className={`${shell.tile} ${shell.danger}`}>
          <svg
            width='22'
            height='22'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'>
            <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
            <path d='M12 9v4' />
            <path d='M12 17h.01' />
          </svg>
        </span>
        <h2 className={shell.title} id='duplicate-transaction-modal-title'>
          Duplicate Transaction Detected
        </h2>
        <div
          id='duplicate-transaction-modal-description'
          className={shell.body}>
          <p className={shell.text}>
            You are attempting to repeat a transaction that may have already
            been processed.
          </p>
          <p className={`${shell.warning} ${shell.warningDanger}`}>
            Please check the block explorer before continuing to avoid duplicate
            transactions.
          </p>
          <div className={styles.card}>
            <p className={styles.recommendation}>Recommendations:</p>
            <ul className={styles.bulletList}>
              <li className={styles.bulletPoint}>
                Check your transaction history
              </li>
              <li className={styles.bulletPoint}>Verify on block explorer</li>
              <li className={styles.bulletPoint}>
                Wait for confirmation before retrying
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.action}>
          <GeneralButton fullWidth onClick={onClose}>
            I Understand
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default DuplicateTransactionModal;
