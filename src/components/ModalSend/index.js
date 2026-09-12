// import React, {useState, useEffect, useContext} from 'react';
// import {Text, div, button, Dimensions} from 'react-native';
// import {Modal} from 'react-native-paper';
// import myStyles from './ModaSend.module.css';
// import {useSelector} from 'react-redux';
// import {ThemeContext} from '../../../ThemeContext';
// import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

// const WIDTH = Dimensions.get('window').width;
// const HEIGHT = Dimensions.get('window').height;

import {Box, Modal} from '@mui/material';
import s from './ModaSend.module.css';
import {useParams, useRouter} from 'next/navigation';

const ModalSend = ({visible, hideModal, currentCoin}) => {
  const {clientId} = useParams();
  // const {theme} = useContext(ThemeContext);
  // const styles = myStyles(theme);
  // const currentCoin = useSelector(selectCurrentCoin);

  // const containerStyle = {
  //   backgroundColor: theme.secondaryBackgroundColor,
  //   borderTopLeftRadius: 20,
  //   borderTopRightRadius: 20,
  //   height: HEIGHT / 2.5,
  //   alignSelf: 'center',
  //   width: WIDTH,
  // };

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    // width: "50%",
    bgcolor: 'var(--secondaryBackgroundColor)',
    borderRadius: '10px',
    //   outline: "1px solid red",
    overflow: 'hidden',
    // minHeight: "80vh",
  };

  const router = useRouter();

  return (
    <Modal
      open={visible}
      onClose={() => hideModal(false)}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'>
      <Box sx={style}>
        <div className={s.list}>
          <p className={s.listTitle}>You Need {currentCoin?.title}</p>
          <p className={s.listText}>
            In order to send funds, you need to have {currentCoin?.title}.
          </p>
          <div className={s.listbtn}>
            <button
              className={`${s.button} ${s.shadow}`}
              onClick={() => router.push(`/wallet/${clientId}/buy-crypto`)}>
              <p className={s.btnBuy}>Buy {currentCoin?.title}</p>
            </button>
            <button
              className={`${s.button} ${s.shadow}`}
              onClick={() => router.push(`/wallet/${clientId}/swap`)}>
              <p className={s.btnEx}>Exchange</p>
            </button>
          </div>
        </div>
      </Box>
    </Modal>
  );
};

export default ModalSend;
