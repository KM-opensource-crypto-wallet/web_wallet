import Modal from '@mui/material/Modal';
import styles from './ModalLoad.module.css';

// Blocking loader over the page (e.g. Sell crypto). No onClose: it stays up
// until the caller stops rendering it.
const ModalLoad = ({open, title = 'Loading...'}) => {
  return (
    <Modal
      open={open}
      aria-labelledby='modal-load-title'
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.card} role='status' aria-live='polite'>
        <span className={styles.spinner} aria-hidden='true' />
        <p id='modal-load-title' className={styles.titleInfo}>
          {title}
        </p>
      </div>
    </Modal>
  );
};

export default ModalLoad;
