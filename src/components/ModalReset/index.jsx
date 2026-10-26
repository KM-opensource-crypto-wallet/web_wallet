import React, {useState} from 'react';
import {logOutSuccess} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {lockSession} from 'security/unlockFlow';
import {persistor} from 'redux/store';
import {wipeAllLocalData} from 'redux/storage/wipe';
import {captureError} from 'services/logger';
import {useDispatch} from 'react-redux';
import {resetWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {addBreadcrumb} from 'services/logger';
import styles from './ModalReset.module.css';
import Modal from '@mui/material/Modal';
import {useRouter} from 'next/navigation';
import {resetCurrentTransferData} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {resetBatchTransactions} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSlice';
import GeneralButton from 'components/Button';

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

const SEED_WARNING =
  'Please make sure you have a copy of 12-word seed phrase. You will need it in order to restore your wallet. Without it you will NOT be able to restore your wallet and you will lose access to your funds.';

// Copy and look per entry; 'Reset Wallet' and 'Forgot' wipe data, 'LogOut'
// only locks the session.
const CONTENT = {
  'Reset Wallet': {
    title: 'Reset wallet?',
    confirm: 'Reset wallet',
    busy: 'Resetting…',
    danger: true,
    icon: (
      <Icon>
        <path d='M3 12a9 9 0 1 0 3-6.7L3 8' />
        <path d='M3 3v5h5' />
      </Icon>
    ),
  },
  Forgot: {
    title: 'Erase this wallet?',
    confirm: 'Erase and start over',
    busy: 'Erasing…',
    danger: true,
    icon: (
      <Icon>
        <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
        <path d='M12 9v4' />
        <path d='M12 17h.01' />
      </Icon>
    ),
  },
  LogOut: {
    title: 'Log out?',
    confirm: 'Log out',
    busy: 'Logging out…',
    danger: false,
    icon: (
      <Icon>
        <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
        <path d='M16 17l5-5-5-5' />
        <path d='M21 12H9' />
      </Icon>
    ),
  },
};

// Confirmation behind the sidebar's Reset Wallet and Log out entries (and
// forgot password). Bottom sheet on phones, centred dialog from 600px up.
const ModalReset = ({visible, hideModal, page}) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const content = CONTENT[page] || CONTENT.LogOut;

  const handlerNo = () => {
    if (!busy) {
      hideModal(false);
    }
  };

  const handlerYes = async () => {
    setBusy(true);
    // The masterClientId is discarded with the store, so user attribution
    // ends here (AppRouting clears it when the selector goes empty).
    addBreadcrumb('wallet', 'reset', {reason: page});
    try {
      if (page === 'Reset Wallet') {
        dispatch(resetWallet());
        hideModal(false);
        router.push('/auth/reset-wallet');
      } else if (page === 'Forgot') {
        // Forgot password provably means the vault is unrecoverable: the
        // account, its wallets, the vault and every local trace go (seed
        // phrase or nothing). Pause redux-persist first so the reset
        // dispatches below cannot stage writes that would re-open the
        // databases while the wipe deletes them.
        persistor.pause();
        dispatch(logOutSuccess());
        dispatch(resetWallet());
        dispatch(resetCurrentTransferData());
        dispatch(resetBatchTransactions());
        try {
          await wipeAllLocalData({persistor});
        } catch (e) {
          captureError(e, {tags: {area: 'storage', op: 'wipe'}});
        }
        // Full page load, not a client-side push: it drops every IndexedDB
        // connection (a delete blocked by one only completes then) and boots
        // the empty profile from scratch instead of the reset in-memory store.
        window.location.replace('/auth/registration');
      } else {
        // Log out (W2): zeroise keys in memory and pause sealed persistence
        // until the next login. Awaited: the keys must be gone before the
        // login page renders.
        await dispatch(lockSession());
        hideModal(false);
        router.push('/auth/login');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={visible}
      onClose={handlerNo}
      aria-labelledby='modal-reset-title'
      aria-describedby='modal-reset-description'
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <span
          className={`${styles.tile} ${content.danger ? styles.danger : ''}`}>
          {content.icon}
        </span>
        <h2 id='modal-reset-title' className={styles.title}>
          {content.title}
        </h2>
        <div id='modal-reset-description' className={styles.body}>
          {page === 'LogOut' ? (
            <p className={styles.text}>
              You&apos;ll need your password to unlock this wallet again.
            </p>
          ) : null}
          <p
            className={`${styles.warning} ${
              content.danger ? styles.warningDanger : ''
            }`}>
            {SEED_WARNING}
          </p>
          <p className={styles.text}>Are you sure you want to proceed?</p>
        </div>
        <div className={styles.actions}>
          <GeneralButton
            variant='secondary'
            fullWidth
            disabled={busy}
            onClick={handlerNo}>
            Cancel
          </GeneralButton>
          <GeneralButton
            variant={content.danger ? 'danger' : 'primary'}
            fullWidth
            loading={busy}
            loadingLabel={content.busy}
            onClick={handlerYes}>
            {content.confirm}
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalReset;
