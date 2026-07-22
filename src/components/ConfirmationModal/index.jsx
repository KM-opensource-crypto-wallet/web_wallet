import React, {useCallback} from 'react';
import {Box, Modal} from '@mui/material';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import s from './ConfirmationModal.module.css';

// Brand-neutral warn/danger accents so they read correctly in both themes.
const WARN = '#F5A623';
const DANGER = '#E5484D';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxHeight: '85%',
  overflowY: 'auto',
  bgcolor: 'var(--secondaryBackgroundColor)',
  '@media (min-width: 768px)': {
    width: '50%',
  },
  borderRadius: '24px',
  outline: 'none',
};

/**
 * Generic confirmation modal with a warning icon, title, subtitle,
 * optional info card and confirm/dismiss buttons. The confirm button
 * is styled as destructive (outlined danger), the dismiss button as
 * the safe default.
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
  const handleDismiss = useCallback(() => {
    onDismiss && onDismiss();
  }, [onDismiss]);

  const handleConfirm = useCallback(() => {
    onConfirm && onConfirm();
  }, [onConfirm]);

  return (
    <Modal open={visible} onClose={handleDismiss}>
      <Box sx={modalStyle}>
        <div className={s.modalContainer}>
          <div className={s.iconBadge}>
            <Icon style={{color: WARN, fontSize: 34}} />
          </div>

          <p className={s.title}>{title}</p>
          {!!subtitle && <p className={s.subtitle}>{subtitle}</p>}

          {!!infoText && (
            <div className={s.infoCard}>
              <InfoIcon style={{color: 'var(--gray)', fontSize: 18}} />
              <p className={s.infoText}>{infoText}</p>
            </div>
          )}

          <div className={s.btnRow}>
            <button
              type='button'
              className={`${s.btn} ${s.confirmBtn}`}
              style={{borderColor: DANGER}}
              onClick={handleConfirm}>
              <span className={s.confirmText} style={{color: DANGER}}>
                {confirmLabel}
              </span>
            </button>
            <button
              type='button'
              className={`${s.btn} ${s.dismissBtn}`}
              onClick={handleDismiss}>
              <span className={s.dismissText}>{dismissLabel}</span>
            </button>
          </div>
        </div>
      </Box>
    </Modal>
  );
};

export {WARN, DANGER};
export default ConfirmationModal;
