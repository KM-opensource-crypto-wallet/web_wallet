import React from 'react';
import shell from 'components/ModalReset/ModalReset.module.css';
import styles from './ModalConfirmEnableChatModal.module.css';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
import Loading from 'components/Loading';
import {currencySymbol} from 'data/currency';
import Spinner from 'components/Spinner';

const Icon = ({children}) => (
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
    {children}
  </svg>
);

// Confirms cancelling or speeding up a pending transaction and shows the
// estimated fee once it loads. Only No / Yes dismiss it (no backdrop / Esc
// close). Same sheet / dialog look as the Reset Wallet confirmation.
const ModalCancelPendingTransaction = ({
  visible,
  onPressYes,
  onPressNo,
  pendingTransferData,
  currentCoin,
  localCurrency,
  isCancelTransaction,
}) => {
  const {isLoading, fiatEstimateFee, transactionFee, success} =
    pendingTransferData;
  return (
    <Modal
      open={visible}
      aria-labelledby='modal-cancel-pending-title'
      aria-describedby='modal-cancel-pending-description'
      slotProps={{backdrop: {className: shell.backdrop}}}>
      <div className={shell.sheet}>
        <div className={shell.handle} />
        <span
          className={`${shell.tile} ${
            isCancelTransaction ? shell.danger : ''
          }`}>
          {isCancelTransaction ? (
            <Icon>
              <circle cx='12' cy='12' r='9' />
              <path d='m15 9-6 6M9 9l6 6' />
            </Icon>
          ) : (
            <Icon>
              <path d='M13 2 3 14h9l-1 8 10-12h-9l1-8z' />
            </Icon>
          )}
        </span>
        <h2 id='modal-cancel-pending-title' className={shell.title}>{`${
          isCancelTransaction ? 'Cancel' : 'Speed Up'
        } Transaction?`}</h2>
        <div id='modal-cancel-pending-description' className={shell.body}>
          <p className={shell.text}>
            {`Are you sure you want to ${
              isCancelTransaction ? 'cancel' : 'speed up'
            } the pending transaction? Please note that a fee may apply.`}
          </p>
          <div aria-live='polite'>
            {isLoading ? (
              <div className={styles.feeCard}>
                <Loading size={28} height={'56px'} />
              </div>
            ) : success ? (
              <div className={styles.feeCard}>
                <div className={styles.feeTitle}>{'Estimate Fees:'}</div>
                <div className={styles.feeValues}>
                  <div
                    className={
                      styles.feeDescription
                    }>{`${transactionFee} ${currentCoin?.chain_symbol}`}</div>
                  <div className={styles.feeFiat}>
                    {currencySymbol[localCurrency] + fiatEstimateFee}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className={shell.actions}>
          <GeneralButton variant='secondary' fullWidth onClick={onPressNo}>
            No
          </GeneralButton>
          <GeneralButton fullWidth onClick={onPressYes}>
            Yes
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalCancelPendingTransaction;
