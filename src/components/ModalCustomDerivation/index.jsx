import React, {useCallback, useState} from 'react';

import {useDispatch, useSelector} from 'react-redux';
import styles from './ModalCustomDerivation.module.css';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import {Checkbox} from '@mui/material';
import {updateCustomDerivedChecked} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import {isCustomDerivedChecked} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';

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

const ModalCustomDerivation = ({visible, hideModal}) => {
  const isCheckedStored = useSelector(isCustomDerivedChecked);
  const [checked, setChecked] = useState(false);
  const dispatch = useDispatch();
  const handlerNo = useCallback(() => {
    hideModal();
  }, [hideModal]);

  const handlerYes = useCallback(() => {
    dispatch(updateCustomDerivedChecked(true));
    hideModal(true);
  }, [dispatch, hideModal]);

  const handleCheckBox = useCallback(() => {
    setChecked(prev => !prev);
  }, [setChecked]);

  return (
    <Modal
      open={visible}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'>
      <Box sx={style}>
        <div className={styles.container}>
          <div className={styles.infoList}>
            <p className={styles.titleInfo}>{'Attention!'}</p>
            <p className={styles.info}>
              {
                'The “Custom Derivation” feature is an advanced option. It’s important to ensure you have a solid understanding of derivations before proceeding.\n Would you like to continue?'
              }
            </p>
          </div>
          <div className={styles.checkbox}>
            <Checkbox checked={checked} onChange={handleCheckBox} />
            <p className={styles.info}>{`Don't show this popup again`}</p>
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

export default ModalCustomDerivation;
