import React, {useState} from 'react';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import SponsoredGasInfoModal from 'components/SponsoredGasInfoModal';
import s from './SponsoredGasToggle.module.css';

const SponsoredGasToggle = ({tokenSymbol, checked, onToggle}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <div className={s.row}>
        <label className={s.labelRow}>
          <Checkbox
            checked={!!checked}
            onChange={onToggle}
            sx={{padding: 0, color: 'var(--gray)'}}
          />
          <span className={s.text}>{`Pay gas fees with ${tokenSymbol}`}</span>
        </label>
        <IconButton
          className={s.infoBtn}
          aria-label='About paying gas fees with your token'
          onClick={() => setShowInfo(true)}>
          <InfoOutlined className={s.infoIcon} />
        </IconButton>
      </div>
      <SponsoredGasInfoModal
        visible={showInfo}
        tokenSymbol={tokenSymbol}
        onClose={() => setShowInfo(false)}
      />
    </>
  );
};

export default SponsoredGasToggle;
