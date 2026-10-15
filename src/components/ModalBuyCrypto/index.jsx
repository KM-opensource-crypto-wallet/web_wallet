import React, {useState, useEffect, useContext} from 'react';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './ModalBuyCrypto.module.css';

// import { ThemeContext } from "../../../ThemeContext";
// import { source } from "deprecated-react-native-prop-types/DeprecatedImagePropType";
// import { InAppBrowser } from "react-native-inappbrowser-reborn";
// import { inAppBrowserOptions } from "config/config";

// "Address copied" notice before handing off to a buy-crypto provider.
// Bottom sheet on phones, centred dialog from 600px up.
const ModalBuyCrypto = ({visible, hideModal, cryptoProvider}) => {
  // const { theme } = useContext(ThemeContext);
  // const styles = myStyles(theme);

  return (
    <Modal
      open={visible}
      onClose={() => hideModal(false)}
      aria-labelledby='modal-buy-crypto-title'
      aria-describedby='modal-buy-crypto-description'
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
            <rect x='8' y='2' width='8' height='4' rx='1' />
            <path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' />
            <path d='m9 14 2 2 4-4' />
          </svg>
        </span>
        <h2 id='modal-buy-crypto-title' className={styles.title}>
          Your Dokwallet`s address was copied to clipboard.
        </h2>
        <div id='modal-buy-crypto-description' className={styles.body}>
          <p className={styles.text}>
            Simply paste it when asked by
            {cryptoProvider?.title?.toLowerCase()}
          </p>
          <p className={styles.warning}>
            **Please double check when purchasing for the first time.
          </p>
        </div>
        <div className={s.action}>
          <GeneralButton
            fullWidth
            onClick={async () => {
              hideModal(false);
              // const url = cryptoProvider.uri;
              // const isAvailable = await InAppBrowser.isAvailable();
              // if (isAvailable) {
              //   await InAppBrowser.open(url, inAppBrowserOptions);
              // }
            }}>
            Ok
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalBuyCrypto;
