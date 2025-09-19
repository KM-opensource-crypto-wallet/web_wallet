'use client';
import React from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import styles from './DuplicateTransactionModal.module.css';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  bgcolor: 'var(--secondaryBackgroundColor)',
  borderRadius: '15px',
  overflow: 'hidden',
  maxHeight: '90vh',
  '@media (min-width: 500px)': {
    width: '60%',
  },
  '@media (min-width: 768px)': {
    width: '40%',
  },
  '@media (min-width: 1024px)': {
    width: '30%',
  },
};

const DuplicateTransactionModal = ({visible, onClose}) => {
  return (
    <Modal
      open={visible}
      onClose={() => {}}
      aria-labelledby='duplicate-transaction-modal-title'
      aria-describedby='duplicate-transaction-modal-description'>
      <Box sx={style}>
        <div className={styles.container}>
          <div className={styles.infoList}>
            <div className={styles.iconContainer}>
              <span className={styles.warningIcon}>⚠️</span>
            </div>
            <h2
              className={styles.titleInfo}
              id='duplicate-transaction-modal-title'>
              Duplicate Transaction Detected
            </h2>
            <div className={styles.messageContainer}>
              <p className={styles.info}>
                You are attempting to repeat a transaction that may have already
                been processed.
              </p>
              <p className={styles.infoHighlight}>
                Please check the block explorer before continuing to avoid
                duplicate transactions.
              </p>
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

          <div className={styles.btnList}>
            <button className={styles.learnBox} onClick={onClose}>
              <span className={styles.learnText}>I Understand</span>
            </button>
          </div>
        </div>
      </Box>
    </Modal>
  );
};

export default DuplicateTransactionModal;
