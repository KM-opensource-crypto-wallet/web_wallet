// import React, {useState, useEffect, useContext} from 'react';
// import {Text, div, button, Dimensions} from 'react-native';
// import {Modal} from 'react-native-paper';
// import myStyles from './ModaSend.module.css';
// import {useSelector} from 'react-redux';
// import {ThemeContext} from '../../../ThemeContext';
// import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

// const WIDTH = Dimensions.get('window').width;
// const HEIGHT = Dimensions.get('window').height;

import {walletRoutes} from 'utils/routes';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './ModaSend.module.css';
import {useParams, useRouter} from 'next/navigation';

// Shown when the user tries to send without holding the coin: offers Buy or
// Exchange. Bottom sheet on phones, centred dialog from 600px up.
const ModalSend = ({visible, hideModal, currentCoin}) => {
  const {clientId} = useParams();
  // const {theme} = useContext(ThemeContext);
  // const styles = myStyles(theme);
  // const currentCoin = useSelector(selectCurrentCoin);

  const router = useRouter();

  return (
    <Modal
      open={visible}
      onClose={() => hideModal(false)}
      aria-labelledby='modal-send-title'
      aria-describedby='modal-send-description'
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <span className={styles.tile}>
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
            <path d='M20 7H5a2 2 0 0 1 0-4h13v4' />
            <path d='M3 5v14a2 2 0 0 0 2 2h15V7' />
            <path d='M16 14h.01' />
          </svg>
        </span>
        <h2 id='modal-send-title' className={styles.title}>
          You Need {currentCoin?.title}
        </h2>
        <div id='modal-send-description' className={styles.body}>
          <p className={styles.text}>
            In order to send funds, you need to have {currentCoin?.title}.
          </p>
        </div>
        <div className={styles.actions}>
          <GeneralButton
            variant='secondary'
            fullWidth
            onClick={() => router.push(walletRoutes.swap(clientId))}>
            <span className={s.label}>Exchange</span>
          </GeneralButton>
          <GeneralButton
            fullWidth
            onClick={() => router.push(walletRoutes.buyCrypto(clientId))}>
            <span className={s.label}>Buy {currentCoin?.title}</span>
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalSend;
