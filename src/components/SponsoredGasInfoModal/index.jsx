import React from 'react';
import {Box, Modal} from '@mui/material';
import LocalGasStationOutlined from '@mui/icons-material/LocalGasStationOutlined';
import s from './SponsoredGasInfoModal.module.css';

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

const SponsoredGasInfoModal = ({visible, tokenSymbol, onClose}) => {
  const symbol = tokenSymbol || 'stablecoin';
  const bullets = [
    'You pay the gas cost plus a 0.5% service fee.',
    'The total shows as the Network Fee before you confirm.',
    'Your transfer and the fee are sent together, so if one fails neither happens.',
    `Your ${symbol} balance has to cover both the amount you send and the fee.`,
  ];

  return (
    <Modal
      open={!!visible}
      onClose={onClose}
      aria-labelledby='sponsored-gas-info-title'>
      <Box sx={modalStyle}>
        <div className={s.content}>
          <div className={s.iconBadge}>
            <LocalGasStationOutlined className={s.badgeIcon} />
          </div>
          <p className={s.title} id='sponsored-gas-info-title'>
            {`Pay gas fees with ${symbol}`}
          </p>
          <p className={s.message}>
            {`Normally you need the network's own coin to pay the gas fee. With this on, we pay it for you and take the cost back in ${symbol}.`}
          </p>
          <div className={s.bulletList}>
            {bullets.map(bullet => (
              <div className={s.bulletRow} key={bullet}>
                <span className={s.bulletDot} />
                <p className={s.bulletText}>{bullet}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={s.btnList}>
          <button className={s.primaryBtn} onClick={onClose}>
            <span className={s.primaryBtnText}>Got it</span>
          </button>
        </div>
      </Box>
    </Modal>
  );
};

export default SponsoredGasInfoModal;
