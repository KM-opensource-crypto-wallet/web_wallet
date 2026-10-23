import React, {useState} from 'react';
import Modal from '@mui/material/Modal';
import {useDispatch} from 'react-redux';
import {logOutSuccess} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {resetWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {resetCurrentTransferData} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {resetBatchTransactions} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSlice';
import {persistor} from 'redux/store';
import {wipeAllLocalData} from 'redux/storage/wipe';
import {addBreadcrumb, captureError} from 'services/logger';
import {reloadToRegistration} from 'utils/reloadToRegistration';
import styles from './ModalResetAllWallets.module.css';

const CONFIRM_PHRASE = 'RESET ALL WALLETS';

// "Forgot password" from the login screen. The vault cannot be opened without
// the password, so the only way forward is wiping this device and restoring
// from the seed phrase. Typing the phrase guards against a misclick.
const ModalResetAllWallets = ({visible, onClose}) => {
  const dispatch = useDispatch();
  const [text, setText] = useState('');
  const [resetting, setResetting] = useState(false);
  const ready = text.trim().toUpperCase() === CONFIRM_PHRASE;

  const handleClose = () => {
    if (resetting) {
      return;
    }
    setText('');
    onClose();
  };

  const handleReset = async e => {
    e.preventDefault();
    if (!ready || resetting) {
      return;
    }
    setResetting(true);
    addBreadcrumb('wallet', 'reset', {reason: 'Forgot'});
    // The account, its wallets, the vault and every local trace go (seed
    // phrase or nothing). Pause redux-persist first so the reset dispatches
    // below cannot stage writes that would re-open the databases while the
    // wipe deletes them.
    persistor.pause();
    dispatch(logOutSuccess());
    dispatch(resetWallet());
    dispatch(resetCurrentTransferData());
    dispatch(resetBatchTransactions());
    try {
      await wipeAllLocalData({persistor});
    } catch (error) {
      captureError(error, {tags: {area: 'storage', op: 'wipe'}});
    }
    reloadToRegistration();
  };

  return (
    <Modal
      open={visible}
      onClose={handleClose}
      aria-labelledby='reset-all-title'
      aria-describedby='reset-all-description'
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <form className={styles.sheet} onSubmit={handleReset}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <div className={styles.iconTile}>
            <svg
              width='26'
              height='26'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'>
              <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
              <line x1='12' y1='9' x2='12' y2='13' />
              <line x1='12' y1='17' x2='12.01' y2='17' />
            </svg>
          </div>
          <h2 id='reset-all-title' className={styles.title}>
            Reset all wallets?
          </h2>
        </div>
        <p id='reset-all-description' className={styles.text}>
          This removes every wallet from this device and starts setup from the
          beginning. Your funds are safe only if you have your seed phrase —
          without it, they cannot be recovered.
        </p>
        <div>
          <label htmlFor='reset-all-confirm' className={styles.label}>
            Type <span className={styles.phrase}>{CONFIRM_PHRASE}</span> to
            confirm
          </label>
          <input
            id='reset-all-confirm'
            className={styles.input}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete='off'
            autoCapitalize='characters'
            spellCheck={false}
            disabled={resetting}
          />
        </div>
        <div className={styles.actions}>
          <button
            type='button'
            className={styles.cancel}
            onClick={handleClose}
            disabled={resetting}>
            Cancel
          </button>
          <button
            type='submit'
            className={styles.danger}
            disabled={!ready || resetting}>
            {resetting ? (
              <>
                <span className={styles.spinner} aria-hidden='true' />
                Resetting…
              </>
            ) : (
              'Reset all wallets'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalResetAllWallets;
