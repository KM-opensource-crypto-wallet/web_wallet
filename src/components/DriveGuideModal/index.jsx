import React from 'react';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './DriveGuideModal.module.css';

// Shown before the Google sign-in for Drive backup / restore. No onClose: it
// only closes through its button. Bottom sheet on phones, centred dialog
// from 600px up.
const DriveGuideModal = ({visible, onContinue}) => {
  return (
    <Modal
      open={visible}
      aria-labelledby='drive-guide-modal-title'
      aria-describedby='drive-guide-modal-description'
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <span className={styles.tile}>
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
            <rect x='3' y='3' width='18' height='18' rx='4' />
            <path d='m8 12 3 3 5-6' />
          </svg>
        </span>
        <h2 id='drive-guide-modal-title' className={styles.title}>
          Important Step!
        </h2>
        <div id='drive-guide-modal-description' className={styles.body}>
          <p className={s.notice}>
            When signing in with Google, please make sure to CHECK the box to
            allow the app to access its own folder in your Google Drive.
          </p>
        </div>
        <GeneralButton
          variant='primary'
          fullWidth
          className={s.action}
          onClick={onContinue}>
          I Understand, Continue
        </GeneralButton>
      </div>
    </Modal>
  );
};

export default DriveGuideModal;
