import React from 'react';
import {Box, Modal} from '@mui/material';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import {RELOCK_OPTIONS} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import s from './ModalHideWalletConfirm.module.css';

const RELOCK_DESCRIPTION = {
  [RELOCK_OPTIONS.RELAUNCH]:
    'It will re-hide the next time you refresh or reload the page.',
  [RELOCK_OPTIONS.MANUAL]:
    'It will stay revealed until you manually turn this switch off.',
};

const INFO_BULLETS = [
  'Hiding a wallet removes it from the Wallets list and every screen that shows your wallets, including Swap and Send/Receive etc.',
  "You'll set a secret code to hide it. The code itself is never stored - only a securely scrambled version of it is kept.",
  'To bring a hidden wallet back, search its exact secret code on the Wallets screen. Partial matches do not reveal it.',
  'Choose how it re-hides itself: on page refresh (default), or only when you manually turn this switch off.',
  'While backing up to Google Drive, hidden wallets are not backed up. Turn off Hide Wallet for this wallet if you want it included in your Google Drive backup.',
];

const CONFIRM_BULLETS = [
  'This wallet will disappear from the Wallets list and every screen that shows wallets, including Swap and Send/Receive.',
  'The only way to bring it back is to search its exact secret code on the Wallets screen.',
  'While backing up to Google Drive, hidden wallets are not backed up. Turn off Hide Wallet for this wallet if you want it included in your Google Drive backup.',
];

const INFO_CONTENT = {
  info: {title: 'About Hide Wallet', bullets: INFO_BULLETS},
};

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '95%',
  maxHeight: '85%',
  overflowY: 'auto',
  bgcolor: 'var(--secondaryBackgroundColor)',
  '@media (min-width: 768px)': {
    width: '55%',
  },
  borderRadius: '24px',
  outline: 'none',
};

const ModalHideWalletConfirm = ({
  visible,
  mode = 'confirm',
  relockOption,
  onConfirm,
  onCancel,
}) => {
  const isConfirmMode = mode === 'confirm';
  const infoContent = INFO_CONTENT[mode] || INFO_CONTENT.info;
  let bullets;
  if (isConfirmMode) {
    bullets = [
      ...CONFIRM_BULLETS,
      RELOCK_DESCRIPTION[relockOption] ||
        RELOCK_DESCRIPTION[RELOCK_OPTIONS.RELAUNCH],
    ].filter(Boolean);
  } else {
    bullets = infoContent.bullets;
  }

  return (
    <Modal
      open={visible}
      onClose={() => {
        // Confirm mode isn't dismissable by backdrop/escape - the user must
        // pick an explicit action.
        if (!isConfirmMode) {
          onCancel && onCancel();
        }
      }}
      aria-labelledby='hide-wallet-confirm-title'>
      <Box sx={modalStyle}>
        <div className={s.content}>
          <div className={s.iconBadge}>
            {isConfirmMode ? (
              <VisibilityOffOutlined className={s.badgeIcon} />
            ) : (
              <InfoOutlined className={s.badgeIcon} />
            )}
          </div>
          <p className={s.title} id='hide-wallet-confirm-title'>
            {isConfirmMode ? 'Hide this wallet?' : infoContent.title}
          </p>
          <div className={s.bulletList}>
            {bullets.map((bullet, index) => (
              <div className={s.bulletRow} key={index}>
                <span className={s.bulletDot} />
                <p className={s.bulletText}>{bullet}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={s.btnList}>
          {!isConfirmMode ? (
            <button className={s.primaryBtn} onClick={onCancel}>
              <span className={s.primaryBtnText}>Got it</span>
            </button>
          ) : (
            <>
              <button className={s.primaryBtn} onClick={onConfirm}>
                <span className={s.primaryBtnText}>Got it, hide wallet</span>
              </button>
              <button className={s.secondaryBtn} onClick={onCancel}>
                <span className={s.secondaryBtnText}>Cancel</span>
              </button>
            </>
          )}
        </div>
      </Box>
    </Modal>
  );
};

export default ModalHideWalletConfirm;
