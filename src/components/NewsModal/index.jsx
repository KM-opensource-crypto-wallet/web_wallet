import React from 'react';
import Modal from '@mui/material/Modal';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './NewsModal.module.css';

// "Important News!" notice from the backend. Closes on backdrop / Esc only.
// Bottom sheet on phones, centred dialog from 600px up.
const NewsModal = ({onClose, message, visible}) => {
  return (
    <Modal
      open={visible}
      onClose={() => onClose(false)}
      aria-labelledby='modal-news-title'
      aria-describedby='modal-news-description'
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
            <path d='M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z' />
            <path d='M16 8.5a5 5 0 0 1 0 7' />
            <path d='M19 5.5a9 9 0 0 1 0 13' />
          </svg>
        </span>
        <h2 id='modal-news-title' className={styles.title}>
          {'Important News!'}
        </h2>
        <div
          id='modal-news-description'
          className={`${styles.text} ${s.description}`}>
          {message}
        </div>
      </div>
    </Modal>
  );
};
export default NewsModal;
