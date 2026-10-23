import React, {useState} from 'react';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './ModalDeleteBackup.module.css';

// Type-to-confirm before deleting the Google Drive backups. No onClose: it
// only closes through No / Yes. Bottom sheet on phones, centred dialog from
// 600px up.
const ModalDeleteBackup = ({visible, hideModal, onConfirm}) => {
  const [text, setText] = useState('');

  const isConfirmed = text.toLowerCase() === 'confirm';

  const handlerNo = () => {
    setText('');
    hideModal();
  };

  const handlerYes = () => {
    setText('');
    hideModal();
    onConfirm();
  };

  return (
    <Modal
      open={visible}
      aria-labelledby='delete-backup-modal-title'
      aria-describedby='delete-backup-modal-description'
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <span className={`${styles.tile} ${styles.danger}`}>
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
            <path d='M3 6h18' />
            <path d='M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2' />
            <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
            <path d='M10 11v6M14 11v6' />
          </svg>
        </span>
        <h2 id='delete-backup-modal-title' className={styles.title}>
          Delete Backup
        </h2>
        <div id='delete-backup-modal-description' className={styles.body}>
          <p className={styles.text}>
            This will permanently delete all wallet backups from your Google
            Drive.
          </p>
          <p className={styles.text}>
            Your local wallets will NOT be affected. Only the backup files
            stored in Google Drive will be deleted.
          </p>
          <p className={`${styles.warning} ${styles.warningDanger}`}>
            This action cannot be undone. Type &quot;confirm&quot; to proceed.
          </p>
        </div>
        <input
          className={s.input}
          type='text'
          placeholder='Confirm'
          autoCapitalize='none'
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && isConfirmed) {
              handlerYes();
            }
          }}
        />
        <div className={styles.actions}>
          <GeneralButton variant='secondary' fullWidth onClick={handlerNo}>
            No
          </GeneralButton>
          <GeneralButton
            variant='danger'
            fullWidth
            onClick={handlerYes}
            disabled={!isConfirmed}>
            Yes
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalDeleteBackup;
