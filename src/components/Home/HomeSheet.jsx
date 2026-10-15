import React from 'react';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
import s from './Home.module.css';

// Bottom sheet on phones, centred dialog from 600px up (wallet switcher and
// the coin picker behind Send / Receive).
const HomeSheet = ({visible, onClose, title, labelId, className, children}) => (
  <Modal
    open={visible}
    onClose={onClose}
    aria-labelledby={labelId}
    slotProps={{backdrop: {className: s.sheetBackdrop}}}>
    <div className={`${s.sheet} ${className || ''}`}>
      <div className={s.sheetHandle} />
      <div className={s.sheetHeader}>
        <h2 id={labelId} className={s.sheetTitle}>
          {title}
        </h2>
        <GeneralButton
          variant='unstyled'
          className={s.sheetClose}
          aria-label='Close'
          onClick={onClose}>
          <svg
            width='15'
            height='15'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.4'
            strokeLinecap='round'>
            <path d='M18 6L6 18' />
            <path d='M6 6l12 12' />
          </svg>
        </GeneralButton>
      </div>
      {children}
    </div>
  </Modal>
);

export default HomeSheet;
