import React from 'react';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './ModalInfo.module.css';

const InfoGlyph = () => (
  <>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 16v-4.5' />
    <path d='M12 8h.01' />
  </>
);

const WarningGlyph = () => (
  <>
    <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
    <path d='M12 9v4' />
    <path d='M12 17h.01' />
  </>
);

// One-button notice. `tone='danger'` turns the icon and message red (e.g.
// the last password attempt before the wallet is wiped). Bottom sheet on
// phones, centred dialog from 600px up.
const ModalInfo = ({visible, handleClose, title, message, onOkay, tone}) => {
  const danger = tone === 'danger';
  return (
    <Modal
      open={visible}
      onClose={() => handleClose?.()}
      aria-labelledby='modal-info-title'
      aria-describedby='modal-info-description'
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <span className={`${styles.tile} ${danger ? styles.danger : ''}`}>
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
            {danger ? <WarningGlyph /> : <InfoGlyph />}
          </svg>
        </span>
        <h2 id='modal-info-title' className={styles.title}>
          {title}
        </h2>
        <div id='modal-info-description' className={styles.body}>
          {danger ? (
            <p className={`${styles.warning} ${styles.warningDanger}`}>
              {message}
            </p>
          ) : (
            <p className={`${styles.text} ${s.message}`}>{message}</p>
          )}
        </div>
        <div className={s.action}>
          <GeneralButton
            fullWidth
            autoFocus={true}
            onClick={() => (onOkay ? onOkay() : handleClose())}>
            Okay
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalInfo;
