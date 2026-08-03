import React from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import s from './DriveGuideModal.module.css';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '85%',
  bgcolor: 'var(--secondaryBackgroundColor)',
  borderRadius: '20px',
  overflow: 'hidden',
  '@media (min-width: 500px)': {
    width: '60%',
  },
  '@media (min-width: 768px)': {
    width: '40%',
  },
};

const DriveGuideModal = ({visible, onContinue}) => {
  return (
    <Modal open={visible} aria-labelledby='drive-guide-modal-title'>
      <Box sx={style}>
        <div className={s.content}>
          <p id='drive-guide-modal-title' className={s.title}>
            Important Step!
          </p>
          <p className={s.description}>
            When signing in with Google, please make sure to CHECK the box to
            allow the app to access its own folder in your Google Drive.
          </p>
          <button className={s.button} onClick={onContinue}>
            I Understand, Continue
          </button>
        </div>
      </Box>
    </Modal>
  );
};

export default DriveGuideModal;
