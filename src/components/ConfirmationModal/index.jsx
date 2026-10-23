import React, {useCallback, useId} from 'react';
import Modal from '@mui/material/Modal';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './ConfirmationModal.module.css';

// Brand-neutral warn/danger accents so they read correctly in both themes.
const WARN = '#F5A623';
const DANGER = '#E5484D';

/**
 * Generic confirmation modal with a warning icon, title, subtitle,
 * optional info card and confirm/dismiss buttons. The confirm button
 * is styled as destructive (outlined danger), the dismiss button as
 * the safe default. Bottom sheet on phones, centred dialog from 600px up.
 */
const ConfirmationModal = ({
  visible,
  title,
  subtitle,
  infoText,
  icon: Icon = ErrorOutline,
  infoIcon: InfoIcon = ScheduleOutlined,
  confirmLabel = 'Confirm',
  dismissLabel = 'Cancel',
  onConfirm,
  onDismiss,
}) => {
  // Two of these can live on one page, so the aria ids are per instance.
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  const handleDismiss = useCallback(() => {
    onDismiss && onDismiss();
  }, [onDismiss]);

  const handleConfirm = useCallback(() => {
    onConfirm && onConfirm();
  }, [onConfirm]);

  return (
    <Modal
      open={visible}
      onClose={handleDismiss}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <span className={`${styles.tile} ${s.warnTile}`}>
          <Icon className={s.muiIcon} />
        </span>

        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div id={descriptionId} className={styles.body}>
          {!!subtitle && <p className={styles.text}>{subtitle}</p>}

          {!!infoText && (
            <div className={s.infoCard}>
              <InfoIcon className={`${s.muiIcon} ${s.infoIcon}`} />
              <p className={s.infoText}>{infoText}</p>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <GeneralButton
            variant='secondary'
            fullWidth
            className={s.confirmBtn}
            onClick={handleConfirm}>
            {confirmLabel}
          </GeneralButton>
          <GeneralButton fullWidth onClick={handleDismiss}>
            {dismissLabel}
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export {WARN, DANGER};
export default ConfirmationModal;
