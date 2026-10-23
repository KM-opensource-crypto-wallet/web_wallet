import React, {useRef, useContext, useState} from 'react';
import styles from './WalletConnectList.module.css';
import WalletConnectItem from 'components/WalletConnectItem';
import Modal from '@mui/material/Modal';
// Same sheet as the WalletConnect proposal / request modals.
import sheet from 'components/WalletConnectRequestModal/WalletConnectSheet.module.css';

// Connected apps behind the header's "N Apps connected" pill. Bottom sheet on
// phones, centred dialog from 600px up; the rows are WalletConnectItem's.
const WalletConnectList = ({bottomSheetRef, visible, onClose}) => {
  return (
    <Modal
      open={visible}
      onClose={() => onClose(false)}
      aria-label='Connected apps'
      slotProps={{backdrop: {className: sheet.backdrop}}}>
      <div className={sheet.sheet}>
        <div className={sheet.handle} />
        <div className={styles.mainView}>
          <WalletConnectItem />
        </div>
      </div>
    </Modal>
  );
};

export default WalletConnectList;
