import React, {useId} from 'react';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './ModalConfirm.module.css';

// Generic yes / no confirmation (backup warning, clearing batch
// transactions). No onClose: it only closes through one of its buttons.
// Bottom sheet on phones, centred dialog from 600px up.
const ModalConfirm = ({
  visible,
  onPressNo,
  onPressYes,
  title,
  description,
  yesButtonTitle,
  noButtonTitle,
}) => {
  // Unique per instance; more than one can be mounted at a time.
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <Modal
      open={visible}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
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
            <circle cx='12' cy='12' r='9' />
            <path d='M9.2 9.3a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.6-2.8 2.6' />
            <path d='M12 17h.01' />
          </svg>
        </span>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div id={descriptionId} className={styles.body}>
          <p className={`${styles.text} ${s.description}`}>{description}</p>
        </div>
        <div className={styles.actions}>
          <GeneralButton variant='secondary' fullWidth onClick={onPressNo}>
            {noButtonTitle || 'No'}
          </GeneralButton>
          <GeneralButton variant='primary' fullWidth onClick={onPressYes}>
            {yesButtonTitle || 'Yes'}
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalConfirm;
