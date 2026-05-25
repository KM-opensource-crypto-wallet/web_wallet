import React, {useState} from 'react';
import {Box, Modal} from '@mui/material';
import s from './ModalDelegation.module.css';

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

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'var(--secondaryBackgroundColor)',
    borderRadius: '10px',
    overflow: 'hidden',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
  };

  return (
    <Modal open={visible} onClose={handleClose}>
      <Box sx={style}>
        {phase === 'info' ? (
          <div className={s.container}>
            <p className={s.title}>EIP-7702 Delegation</p>
            <p className={s.body}>
              Your wallet currently has an active EIP-7702 delegation. This
              means a smart contract has been authorised to act on behalf of
              your wallet.
            </p>
            <p className={s.body}>
              Removing delegation will revoke this authorisation and restore
              your wallet to its default state. A small gas fee is required to
              complete this operation.
            </p>
            <div className={s.actions}>
              <button
                className={s.primaryBtn}
                onClick={() => setPhase('confirm')}>
                Remove Delegation
              </button>
              <button className={s.secondaryBtn} onClick={handleClose}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={s.container}>
            <p className={s.title}>Remove Delegation?</p>
            <p className={s.body}>
              Are you sure you want to remove the EIP-7702 delegation from your
              wallet? This action will cost a small gas fee and cannot be undone
              without re-authorising the delegation.
            </p>
            <div className={s.actions}>
              <button className={s.primaryBtn} onClick={handleConfirm}>
                Confirm
              </button>
              <button
                className={s.secondaryBtn}
                onClick={() => setPhase('info')}>
                Back
              </button>
            </div>
          </div>
        )}
      </Box>
    </Modal>
  );
};

export default ModalDelegation;
