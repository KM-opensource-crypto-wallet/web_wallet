'use client';

import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';
// import {Dimensions, button, View} from 'react-native';
// import {Modal, Text, input} from 'react-native-paper';
// import myStyles from './ModalConfirmTransactionStyles';
// import {Formik} from 'formik';
import {getUserPassword} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
// import {IS_IOS, useFloatingHeight} from 'dok-wallet-blockchain-networks/service/dimensions';
import {validationSchemaFingerprintVerification} from 'utils/validationSchema';
// import {useKeyboardHeight} from 'dok-wallet-blockchain-networks/service/useKeyboardHeight';
import {useSelector} from 'react-redux';
// import {ThemeContext} from '../../../ThemeContext';
// import {isFingerprint} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
// import FingerprintScanner from 'react-native-fingerprint-scanner';
// import RNScreenshotPrevent from 'react-native-screenshot-prevent';

import {Box, Modal} from '@mui/material';
import s from './ModalConfirmTransaction.module.css';
import {Formik} from 'formik';

const icons = require(`assets/images/icons`).default;

const ModalConfirmTransaction = ({visible, hideModal, onSuccess}) => {
  // const {theme} = useContext(ThemeContext);
  // const styles = myStyles(theme);

  // const floatingModalHeight = useFloatingHeight();
  // const keyboardHeight = useKeyboardHeight();
  const storePassword = useSelector(getUserPassword);
  const [wrong, setWrong] = useState(false);
  // Guards against double-submit (Enter key + click racing, or rapid clicks)
  // firing onSuccess twice and broadcasting the transaction twice.
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      isSubmittingRef.current = false;
    }
  }, [visible]);

  const triggerSuccess = useCallback(() => {
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    onSuccess && onSuccess();
  }, [onSuccess]);
  // const fingerprint = useSelector(isFingerprint);

  // const handleFingerprintAuth = useCallback(async () => {
  //   if (fingerprint && visible) {
  //     try {
  //       await FingerprintScanner.authenticate({
  //         description: 'Unlock Dok Wallet with your fingerprint',
  //       });
  //       onSuccess && onSuccess();
  //     } catch (error) {
  //       if (error.name === 'SystemCancel') {
  //         console.log('Authentication was canceled by the system');
  //       } else {
  //         console.log('Error checking fingerprint settings:', error);
  //       }
  //     } finally {
  //       FingerprintScanner.release();
  //     }
  //   }
  // }, [fingerprint, onSuccess, visible]);

  // useEffect(() => {
  //   if (visible) {
  //     RNScreenshotPrevent.enabled(true);

  //     setTimeout(() => {
  //       handleFingerprintAuth().then();
  //     }, 200);
  //   } else {

  //   }
  // }, [handleFingerprintAuth, visible]);

  const onSubmit = values => {
    const {currentPassword} = values;
    if (currentPassword === storePassword) {
      triggerSuccess();
    } else {
      setWrong(true);
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
    '@media (min-width: 768px)': {
      width: '50%',
    },
    overflow: 'hidden',
  };

  // if (window.matchMedia("(min-width: 768px)").matches) {
  //   style.width = "50%";
  // }

  return (
    <Modal
      open={visible}
      onClose={() => hideModal(false)}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'>
      <Box sx={style}>
        <div className={s.infoList}>
          <div className={s.infoHeader}>
            <p className={s.titleInfo}>
              {'Please enter your password  for confirm the transfer'}
            </p>
            <button
              className={s.infoIcon}
              onClick={() => {
                hideModal(false);
                setWrong(false);
              }}>
              <div className={s.closeBtn}>{icons.close}</div>
            </button>
          </div>

          <Formik
            enableReinitialize={true}
            initialValues={{
              currentPassword: '',
            }}
            validationSchema={validationSchemaFingerprintVerification}
            onSubmit={onSubmit}>
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
            }) => (
              <div className={s.formInput}>
                <input
                  className={s.input}
                  style={{
                    borderColor: errors.currentPassword ? 'red' : 'var(--gray)',
                  }}
                  type={'password'}
                  // underlineColor={errors.currentPassword ? "red" : "#989898"}
                  name='currentPassword'
                  onChange={handleChange('currentPassword')}
                  onBlur={handleBlur('currentPassword')}
                  onSubmit={handleSubmit}
                  value={values.currentPassword}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault(); // Prevent the default Enter key behavior (e.g., new line in textarea)
                      handleSubmit(); // Manually trigger Formik's submit function
                    }
                  }}
                  autoFocus={true}
                />

                {wrong === true ? (
                  <p className={s.textWarning}>* Wrong password</p>
                ) : (
                  <>
                    {errors.currentPassword && touched.currentPassword && (
                      <p className={s.textConfirm}>{errors.currentPassword}</p>
                    )}
                  </>
                )}

                <button
                  className={`${s.button} ${s.shadow}`}
                  onClick={handleSubmit}>
                  <p className={s.buttonTitle}>Verify</p>
                </button>
              </div>
            )}
          </Formik>
        </div>
      </Box>
    </Modal>
  );
};

export default ModalConfirmTransaction;
