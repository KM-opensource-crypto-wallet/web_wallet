import React from 'react';
import styles from './ModalConfirm.module.css';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';

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

const ModalConfirm = ({
  visible,
  onPressNo,
  onPressYes,
  title,
  description,
  yesButtonTitle,
  noButtonTitle,
}) => {
  return (
    <Modal
      open={visible}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'>
      <Box sx={style}>
        <div className={styles.container}>
          <div className={styles.infoList}>
            <p className={styles.titleInfo}>{title}</p>
            <p className={styles.info}>{description}</p>
          </div>
          <div className={styles.btnList}>
            <button className={styles.learnBox} onClick={onPressNo}>
              {noButtonTitle || 'No'}
            </button>

            <button className={styles.learnBox} onClick={onPressYes}>
              {yesButtonTitle || 'Yes'}
            </button>
          </div>
        </div>
      </Box>
    </Modal>
  );
};

export default ModalConfirm;
