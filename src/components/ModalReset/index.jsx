import React, {useState, useEffect, useContext, useLayoutEffect} from 'react';
// import {getUserPassword} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {
  logOutSuccess,
  // fingerprintAuthOut,
} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {useDispatch} from 'react-redux';
import {resetWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import styles from './ModalReset.module.css';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import {useRouter} from 'next/navigation';
import {resetCurrentTransferData} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {resetBatchTransactions} from 'dok-wallet-blockchain-networks/redux/batchTransaction/batchTransactionSlice';

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

const ModalReset = ({visible, hideModal, page, link}) => {
  //   const {theme} = useContext(ThemeContext);
  //   const styles = myStyles(theme);
  const dispatch = useDispatch();
  // const storePassword = useSelector(getUserPassword);
  const [list, setList] = useState('');
  const router = useRouter();

  useEffect(() => {
    setList(page);
  }, [page]);

  const handlerNo = () => {
    if (list === 'Reset Wallet') {
      hideModal(false);
    } else if (list === 'Forgot') {
      hideModal(false);
    } else {
      hideModal(false);
    }
  };

  const handlerYes = () => {
    if (list === 'Reset Wallet') {
      dispatch(resetWallet());
      hideModal(false);
      router.push('/auth/reset-wallet');
    } else if (list === 'Forgot') {
      dispatch(logOutSuccess());
      dispatch(resetWallet());
      dispatch(resetCurrentTransferData());
      dispatch(resetBatchTransactions());
      setTimeout(() => {
        router.push('/auth/registration');
      }, 200);
    } else {
      hideModal(false);
      router.push('/auth/login');
    }
  };

  return (
    <Modal
      open={visible}
      onClose={() => {}}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'>
      <Box sx={style}>
        <div className={styles.container}>
          <div className={styles.infoList}>
            <p className={styles.titleInfo}>{page}</p>
            <p className={styles.info}>
              Please make sure you have a copy of 12-word seed phrase. You will
              need it in order to restore your wallet. Without it you will NOT
              be able to restore your wallet and you will lose access to your
              funds.
            </p>
            <p className={styles.info}>Are you sure you want to proceed?</p>
          </div>
          <div className={styles.btnList}>
            <button className={styles.learnBox} onClick={() => handlerNo()}>
              No
            </button>

            <button className={styles.learnBox} onClick={() => handlerYes()}>
              Yes
            </button>
          </div>
        </div>
      </Box>
    </Modal>
  );
};

export default ModalReset;
