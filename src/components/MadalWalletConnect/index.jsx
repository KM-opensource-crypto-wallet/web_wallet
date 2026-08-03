import React, {useRef, useContext, useState} from 'react';
import styles from './MadalWalletConnect.module.css';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';

const icons = require(`assets/images/connect`).default;
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import walletConnect from 'data/walletConnect';
import {createWalletConnection} from 'dok-wallet-blockchain-networks/service/walletconnect';
import {parseUri} from '@walletconnect/utils';

const isValidWalletConnectUri = value => {
  if (!value?.startsWith('wc:')) {
    return false;
  }
  try {
    const {topic, version} = parseUri(value);
    return Boolean(topic && version);
  } catch (e) {
    return false;
  }
};

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '95%',
  bgcolor: 'var(--secondaryBackgroundColor)',
  borderRadius: '10px',
  overflow: 'hidden',
  minHeight: '80vh',
  '@media (min-width: 768px)': {
    width: '50%',
  },
};

const MadalWalletConnect = ({visible, onClose}) => {
  const [connectValue, setConnectValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectChange = event => {
    setConnectValue(event.target.value);
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleSubmit = async values => {
    const uri = values?.trim();
    if (!isValidWalletConnectUri(uri)) {
      setErrorMessage(
        'Invalid WalletConnect URI. Copy the connection link starting with "wc:" from the dApp — a wallet address will not work here.',
      );
      return;
    }
    setIsConnecting(true);
    try {
      await createWalletConnection({uri});
      setConnectValue('');
      onClose(false);
    } catch (e) {
      console.error('WalletConnect pairing failed:', e);
      setErrorMessage(
        e?.message?.includes('Pairing already exists')
          ? 'This URI was already used. Get a fresh connection link from the dApp.'
          : 'Failed to connect. Get a fresh connection link from the dApp and try again.',
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Modal
      open={visible}
      onClose={() => onClose(false)}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'>
      <Box sx={style}>
        <div className={styles.container}>
          <p className={styles.header}>WalletConnect</p>
          <div className={styles.borderView} />
          <div className={styles.codeBox}>
            <div className={styles.iconBox}>{icons.qr_icon}</div>
            <button className={styles.button}>{'Scan QR code'}</button>
          </div>
          <p className={styles.info}>or use walletconnect uri</p>

          <div className={styles.formInput}>
            <FormControl sx={{m: 1}} variant='outlined'>
              <OutlinedInput
                fullWidth
                id='connect'
                name='connect'
                value={connectValue}
                style={{paddingRight: 120}}
                onChange={handleConnectChange}
                endAdornment={
                  <Chip
                    label={isConnecting ? 'Connecting…' : 'Connect'}
                    disabled={isConnecting}
                    onClick={() => handleSubmit(connectValue)}
                    sx={{
                      color: 'white',
                      backgroundColor: 'var(--background)',
                      position: 'absolute',
                      right: 20,
                    }}
                  />
                }
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--sidebarIcon)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--borderActiveColor)',
                  },
                  '& .MuiInputLabel-outlined': {
                    color: 'var(--sidebarIcon)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--sidebarIcon) !important',
                  },
                }}
              />
            </FormControl>
            {errorMessage ? (
              <p className={styles.errorText}>{errorMessage}</p>
            ) : null}
          </div>

          {/*<div className={styles.btnList}>*/}
          {/*  {walletConnect.map((item) => (*/}
          {/*    <button*/}
          {/*      className={item?.isActive ? styles.btnActive : styles.btn}*/}
          {/*      key={item.name}*/}
          {/*    >*/}
          {/*      {item.icon}*/}
          {/*    </button>*/}
          {/*  ))}*/}
          {/*</div>*/}
        </div>
      </Box>
    </Modal>
  );
};

export default MadalWalletConnect;
