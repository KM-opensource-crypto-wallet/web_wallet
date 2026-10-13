import React from 'react';
import Modal from '@mui/material/Modal';
import {RELOCK_OPTIONS} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import GeneralButton from 'components/Button';
import {EyeIcon, InfoIcon} from 'components/Home/HomeIcons';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
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

// 'info' explains Hide Wallet; 'confirm' asks before hiding. Bottom sheet on
// phones, centred dialog from 600px up.
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
      aria-labelledby='hide-wallet-confirm-title'
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <span className={styles.tile}>
          {isConfirmMode ? <EyeIcon size={22} off /> : <InfoIcon size={22} />}
        </span>
        <h2 className={styles.title} id='hide-wallet-confirm-title'>
          {isConfirmMode ? 'Hide this wallet?' : infoContent.title}
        </h2>
        <ul className={s.bulletList}>
          {bullets.map((bullet, index) => (
            <li className={s.bulletRow} key={index}>
              <span className={s.bulletDot} aria-hidden='true' />
              <p className={s.bulletText}>{bullet}</p>
            </li>
          ))}
        </ul>
        <div className={s.btnList}>
          {!isConfirmMode ? (
            <GeneralButton variant='primary' fullWidth onClick={onCancel}>
              Got it
            </GeneralButton>
          ) : (
            <>
              <GeneralButton variant='primary' fullWidth onClick={onConfirm}>
                Got it, hide wallet
              </GeneralButton>
              <GeneralButton variant='secondary' fullWidth onClick={onCancel}>
                Cancel
              </GeneralButton>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ModalHideWalletConfirm;
