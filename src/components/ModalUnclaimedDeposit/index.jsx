import React, {useCallback} from 'react';
import {Modal} from '@mui/material';
import styles from './ModalUnclaimDeposit.module.css';
import {BtcLightningUnclaimedData} from '../BtcLightningUnclaimedData';

const ModalUnclaimedDeposit = ({visible, hideModal}) => {
  const handleClose = useCallback(() => {
    hideModal(false);
  }, [hideModal]);

  return (
    <Modal
      open={visible}
      onClose={handleClose}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'
      className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalDiv}>
          <div className={styles.btcLightningClaims}>
            <BtcLightningUnclaimedData hideModal={hideModal} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ModalUnclaimedDeposit;
