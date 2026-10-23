import React, {useCallback} from 'react';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './ModalDelete.module.css';

// Confirmation before deleting a wallet (from its Edit screen). Bottom sheet
// on phones, centred dialog from 600px up.
const ModalDelete = ({visible, onPressYes, onPressNo, walletName}) => {
  const handlerYes = useCallback(() => {
    onPressYes && onPressYes();
  }, [onPressYes]);

  const handlerNo = useCallback(() => {
    onPressNo && onPressNo();
  }, [onPressNo]);

  return (
    <Modal
      open={visible}
      onClose={handlerNo}
      aria-labelledby='modal-delete-title'
      aria-describedby='modal-delete-description'
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
        <h2 id='modal-delete-title' className={styles.title}>
          Delete wallet?
        </h2>
        {walletName ? (
          <span className={s.walletChip}>
            <span className={s.walletAvatar} aria-hidden='true'>
              {walletName[0].toUpperCase()}
            </span>
            <span className={s.walletName}>{walletName}</span>
          </span>
        ) : null}
        <div id='modal-delete-description' className={styles.body}>
          <p className={`${styles.warning} ${styles.warningDanger}`}>
            Please make sure you have a copy of 12-word seed phrase. You will
            need it in order to restore your wallet. Without it you will NOT be
            able to restore your wallet and you will lose access to your funds.
          </p>
          <p className={styles.text}>Are you sure you want to proceed?</p>
        </div>
        <div className={styles.actions}>
          <GeneralButton variant='secondary' fullWidth onClick={handlerNo}>
            Cancel
          </GeneralButton>
          <GeneralButton variant='danger' fullWidth onClick={handlerYes}>
            Delete wallet
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalDelete;
