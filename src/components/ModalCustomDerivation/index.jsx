import React, {useCallback} from 'react';

import {useDispatch} from 'react-redux';
import styles from './ModalCustomDerivation.module.css';
import Modal from '@mui/material/Modal';
import {updateCustomDerivedChecked} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import GeneralButton from 'components/Button';

// Warning before Custom Derivation (from the Send pop-over). Bottom sheet on
// phones, centred dialog from 600px up; same look as ModalReset.
const ModalCustomDerivation = ({visible, hideModal}) => {
  const [isCheckboxSelected, setIsCheckboxSelected] = React.useState(false);
  const dispatch = useDispatch();
  const handlerNo = useCallback(() => {
    dispatch(updateCustomDerivedChecked(false));
    hideModal();
  }, [dispatch, hideModal]);

  const handlerYes = useCallback(() => {
    dispatch(updateCustomDerivedChecked(isCheckboxSelected));
    hideModal(true);
  }, [dispatch, hideModal, isCheckboxSelected]);

  const handleCheckBox = useCallback(() => {
    setIsCheckboxSelected(prevState => !prevState);
  }, []);

  return (
    <Modal
      open={visible}
      onClose={handlerNo}
      aria-labelledby='custom-derivation-title'
      aria-describedby='custom-derivation-description'
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
            <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
            <path d='M12 9v4' />
            <path d='M12 17h.01' />
          </svg>
        </span>
        <h2 id='custom-derivation-title' className={styles.title}>
          Attention!
        </h2>
        <div id='custom-derivation-description' className={styles.body}>
          <p className={styles.text}>
            The “Custom Derivation” feature is an advanced option. It’s
            important to ensure you have a solid understanding of derivations
            before proceeding.
          </p>
          <p className={styles.text}>Would you like to continue?</p>
        </div>
        <button
          type='button'
          role='checkbox'
          aria-checked={isCheckboxSelected}
          className={`${styles.dontShow} ${
            isCheckboxSelected ? styles.dontShowOn : ''
          }`}
          onClick={handleCheckBox}>
          <span className={styles.tick} aria-hidden='true'>
            {isCheckboxSelected ? (
              <svg
                width='13'
                height='13'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='3'
                strokeLinecap='round'
                strokeLinejoin='round'>
                <path d='M20 6L9 17l-5-5' />
              </svg>
            ) : null}
          </span>
          Don&apos;t show this popup again
        </button>
        <div className={styles.actions}>
          <GeneralButton variant='secondary' fullWidth onClick={handlerNo}>
            No
          </GeneralButton>
          <GeneralButton fullWidth onClick={handlerYes}>
            Yes, continue
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalCustomDerivation;
