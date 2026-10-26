import React, {useCallback} from 'react';
import {Modal} from '@mui/material';
import {Close} from '@mui/icons-material';
import styles from './ModalUnclaimDeposit.module.css';
import {BtcLightningUnclaimedData} from '../BtcLightningUnclaimedData';

// Lists unclaimed BTC Lightning deposits. Bottom sheet on phones, centred
// dialog from 600px up; the list scrolls inside it.
const ModalUnclaimedDeposit = ({visible, hideModal}) => {
  const handleClose = useCallback(() => {
    hideModal(false);
  }, [hideModal]);

  return (
    <Modal
      open={visible}
      onClose={handleClose}
      aria-labelledby='modal-unclaimed-deposit-title'
      className={styles.modalRoot}
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <div className={styles.modalHeader}>
          <h2 id='modal-unclaimed-deposit-title' className={styles.headerText}>
            Unclaimed Deposits
          </h2>
          <button
            type='button'
            className={styles.btnClose}
            aria-label='Close'
            onClick={handleClose}>
            <Close sx={{fontSize: 20}} />
          </button>
        </div>
        <div className={styles.btcLightningClaims}>
          <BtcLightningUnclaimedData hideModal={hideModal} />
        </div>
      </div>
    </Modal>
  );
};

export default ModalUnclaimedDeposit;
