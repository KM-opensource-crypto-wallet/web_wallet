import React, {useState} from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import s from './ModalDeleteBackup.module.css';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  bgcolor: 'var(--secondaryBackgroundColor)',
  borderRadius: '10px',
  overflow: 'hidden',
  '@media (min-width: 500px)': {
    width: '60%',
  },
  '@media (min-width: 768px)': {
    width: '40%',
  },
};

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
    <Modal open={visible} aria-labelledby='delete-backup-modal-title'>
      <Box sx={style}>
        <div className={s.container}>
          <div className={s.infoList}>
            <p id='delete-backup-modal-title' className={s.titleInfo}>
              Delete Backup
            </p>
            <p className={s.info}>
              This will permanently delete all wallet backups from your Google
              Drive.
            </p>
            <p className={s.info}>
              Your local wallets will NOT be affected. Only the backup files
              stored in Google Drive will be deleted.
            </p>
            <p className={s.info}>
              This action cannot be undone. Type &quot;confirm&quot; to proceed.
            </p>
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
          </div>
          <div className={s.btnList}>
            <button className={s.learnBox} onClick={handlerNo}>
              No
            </button>
            <button
              className={`${s.learnBox} ${!isConfirmed ? s.disabled : ''}`}
              onClick={handlerYes}
              disabled={!isConfirmed}>
              Yes
            </button>
          </div>
        </div>
      </Box>
    </Modal>
  );
};

export default ModalDeleteBackup;
