import React, {useState} from 'react';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './ModalDelegation.module.css';

// Linked chain, cut once the user confirms.
const DelegationIcon = () => (
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
    <path d='M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7' />
    <path d='M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7' />
  </svg>
);

// EIP-7702 delegation: info first, then a confirm step. Bottom sheet on
// phones, centred dialog from 600px up.
const ModalDelegation = ({visible, onClose, onConfirm}) => {
  const [phase, setPhase] = useState('info');

  const handleClose = () => {
    setPhase('info');
    onClose();
  };

  const handleConfirm = () => {
    setPhase('info');
    onClose();
    onConfirm();
  };

  return (
    <Modal
      open={visible}
      onClose={handleClose}
      aria-labelledby='modal-delegation-title'
      aria-describedby='modal-delegation-description'
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <span
          className={`${styles.tile} ${phase === 'info' ? '' : styles.danger}`}>
          <DelegationIcon />
        </span>
        {phase === 'info' ? (
          <>
            <h2 id='modal-delegation-title' className={styles.title}>
              EIP-7702 Delegation
            </h2>
            <div id='modal-delegation-description' className={styles.body}>
              <p className={`${styles.text} ${s.text}`}>
                Your wallet currently has an active EIP-7702 delegation. This
                means a smart contract has been authorised to act on behalf of
                your wallet.
              </p>
              <p className={styles.warning}>
                Removing delegation will revoke this authorisation and restore
                your wallet to its default state. A small gas fee is required to
                complete this operation.
              </p>
            </div>
            <div className={`${styles.actions} ${s.actions}`}>
              <GeneralButton
                variant='secondary'
                fullWidth
                onClick={handleClose}>
                Cancel
              </GeneralButton>
              <GeneralButton fullWidth onClick={() => setPhase('confirm')}>
                Remove Delegation
              </GeneralButton>
            </div>
          </>
        ) : (
          <>
            <h2 id='modal-delegation-title' className={styles.title}>
              Remove Delegation?
            </h2>
            <div id='modal-delegation-description' className={styles.body}>
              <p
                className={`${styles.warning} ${styles.warningDanger} ${s.text}`}>
                Are you sure you want to remove the EIP-7702 delegation from
                your wallet? This action will cost a small gas fee and cannot be
                undone without re-authorising the delegation.
              </p>
            </div>
            <div className={`${styles.actions} ${s.actions}`}>
              <GeneralButton
                variant='secondary'
                fullWidth
                onClick={() => setPhase('info')}>
                Back
              </GeneralButton>
              <GeneralButton variant='danger' fullWidth onClick={handleConfirm}>
                Confirm
              </GeneralButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ModalDelegation;
