import React, {useState, useContext} from 'react';
import {useSelector} from 'react-redux';

const icons = require(`assets/images/verify`).default;
// import {ThemeContext} from '../../../ThemeContext';
// import myStyles from './VerifyInfoStyles';
// import {useNavigation} from '@react-navigation/native';
import styles from './VerifyInfoModal.module.css';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
// import { useRouter } from "next/navigation";
import CryptoCheckbox from 'components/CheckBox';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  bgcolor: 'var(--secondaryBackgroundColor)',
  borderRadius: '10px',
  overflow: 'hidden',
  '@media (min-width: 768px)': {
    width: '40%',
  },
};

export const VerifyInfoModal = ({visible, onClose}) => {
  const [infoCheck, setInfoCheck] = useState(false);
  const router = useRouter();
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);

  return (
    <div>
      <Modal
        open={visible}
        onClose={() => onClose(false)}
        aria-labelledby='modal-modal-title'
        aria-describedby='modal-modal-description'>
        <Box sx={style}>
          <div className={styles.container}>
            <div className={styles.icon}>{icons.warning}</div>

            <p className={styles.title}>Important!</p>

            <div className={styles.infoList}>
              <p className={styles.info}>
                Your account is ready. We used a &nbsp;
                <span className={styles.span}>seed phrase</span>&nbsp; to create
                the private key with which you control your funds.
              </p>
              <p className={styles.infoNext}>
                It is very important that you keep the &nbsp;
                <span className={styles.span}>seed phrase</span>&nbsp;somewhere
                safe, outside of this device.
              </p>

              <Link
                href='/verify/learn'
                target='_blank'
                className={styles.learnText}>
                Learn more.
              </Link>

              <p className={styles.infoRed}>
                IMPORTANT:We do not keep your private key in our servers. It is
                encrypted and stored on this device. If you lose the private
                key, you will lose access to your funds! The &nbsp;
                <span className={styles.spanRed}>seed phrase </span> is the only
                means by which you can restore your key.
              </p>
            </div>

            <CryptoCheckbox
              setInfoCheck={setInfoCheck}
              number={'3'}
              title={'I understand'}
            />

            <div className={styles.btnList}>
              <button
                disabled={!infoCheck}
                className={styles.btnVerify}
                style={{
                  backgroundColor: infoCheck ? 'var(--background)' : '#708090',
                }}
                onClick={() => {
                  onClose();
                  router.push(
                    `/wallet/${currentWalletClientId}/verify/verify-create`,
                  );
                }}>
                Verify seed phrase
              </button>

              <button
                disabled={!infoCheck}
                className={styles.btnLater}
                style={{
                  color: infoCheck ? 'var(--background)' : '#708090',
                }}
                onClick={() => {
                  router.push(`/wallet/${currentWalletClientId}/home`);
                  onClose();
                }}>
                Do it later
              </button>
            </div>
          </div>
        </Box>
      </Modal>
    </div>
  );
};
