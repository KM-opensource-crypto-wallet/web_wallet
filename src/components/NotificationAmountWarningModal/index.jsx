'use client';

import {MIN_USD_AMOUNT} from 'utils/notificationAlertHelpers';
import s from './NotificationAmountWarningModal.module.css';

const NotificationAmountWarningModal = ({visible, onConfirm, onDismiss}) => {
  if (!visible) return null;

  return (
    <div className={s.overlay} onClick={onDismiss}>
      <div className={s.card} onClick={e => e.stopPropagation()}>
        <div className={s.iconWrap}>⚠️</div>
        <p className={s.title}>Low Minimum Amount</p>
        <p className={s.desc}>
          The minimum amount you set is below ${MIN_USD_AMOUNT} USD equivalent.
          You may receive many notifications. Are you sure you want to continue?
        </p>
        <div className={s.actions}>
          <button className={s.cancelBtn} onClick={onDismiss}>
            Go Back
          </button>
          <button className={s.confirmBtn} onClick={onConfirm}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationAmountWarningModal;
