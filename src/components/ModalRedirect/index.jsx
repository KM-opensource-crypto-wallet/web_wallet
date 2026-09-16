import React, {useEffect, useRef} from 'react';
import styles from './ModalRedirect.module.css';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  padding: '12px',
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

const ModalRedirect = ({visible, handleClose, title, message, onOkay}) => {
  const [counter, setCounter] = React.useState(5);
  const counterRef = useRef(5);
  useEffect(() => {
    counterRef.current = counter;
  }, [counter]);
  useEffect(() => {
    const interval = setInterval(() => {
      setCounter(prevState => prevState - 1);
      if (counterRef.current === 1) {
        clearInterval(interval);
        onOkay?.() || handleClose?.();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal
      open={visible}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'>
      <Box sx={style}>
        <div className={styles.container}>
          <div className={styles.infoList}>
            <p className={styles.titleInfo}>{title}</p>
            <p className={styles.info}>{message}</p>
            <div className={styles.countdown}>
              <div key={counter} className={styles.count}>
                {counter}
              </div>
            </div>
          </div>
          <div>
            <button
              className={styles.learnBox}
              onClick={() => (onOkay ? onOkay() : handleClose())}>
              Go now
            </button>
          </div>
        </div>
      </Box>
    </Modal>
  );
};

export default ModalRedirect;
