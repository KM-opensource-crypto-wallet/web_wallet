import React, {useEffect, useRef} from 'react';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './ModalRedirect.module.css';

// Countdown before opening a buy-crypto provider. No onClose on purpose: it
// can't be dismissed, only "Go now" or the countdown move on. Bottom sheet on
// phones, centred dialog from 600px up.
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
      aria-labelledby='modal-redirect-title'
      aria-describedby='modal-redirect-description'
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
            <path d='M15 3h6v6' />
            <path d='M10 14 21 3' />
            <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
          </svg>
        </span>
        <h2 id='modal-redirect-title' className={styles.title}>
          {title}
        </h2>
        <p id='modal-redirect-description' className={styles.text}>
          {message}
        </p>
        <div className={s.countdown}>
          <div key={counter} className={s.count}>
            {counter}
          </div>
        </div>
        <div className={s.action}>
          <GeneralButton
            fullWidth
            onClick={() => (onOkay ? onOkay() : handleClose())}>
            Go now
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalRedirect;
