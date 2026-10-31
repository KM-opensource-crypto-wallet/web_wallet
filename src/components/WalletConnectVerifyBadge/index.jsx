import React from 'react';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import GppMaybeOutlinedIcon from '@mui/icons-material/GppMaybeOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  getWalletConnectVerifyStatus,
  isRiskyVerifyStatus,
  verifyHost,
} from 'dok-wallet-blockchain-networks/helper/walletConnectVerify';
import s from './WalletConnectVerifyBadge.module.css';

const describe = (status, origin, appUrl) => {
  const host = verifyHost(origin) || verifyHost(appUrl);
  switch (status) {
    case 'verified':
      // The verified origin only, never the dApp's self-reported appUrl.
      return {label: 'Verified site', detail: verifyHost(origin)};
    case 'mismatch':
      return {
        label: 'Domain mismatch',
        detail: `This request comes from ${
          verifyHost(origin) || 'another site'
        }, not ${
          verifyHost(appUrl) || 'the app it claims to be'
        }. It may be impersonating that app.`,
      };
    case 'scam':
      return {
        label: 'Known security risk',
        detail: `${host || 'This site'} is flagged as malicious. Reject unless you are certain.`,
      };
    default:
      return {
        label: 'Unverified site',
        detail: `WalletConnect can't confirm this site. Only continue if you trust ${host || 'it'}.`,
      };
  }
};

/**
 * WalletConnect Verify API result for a connection or request. Risky results
 * (scam, domain mismatch) are shown in red; pass `onToggleAcknowledged` to
 * render the "I understand" checkbox the caller gates approval on.
 */
const WalletConnectVerifyBadge = ({
  verifyContext,
  appUrl,
  acknowledged,
  onToggleAcknowledged,
}) => {
  const {status, origin} = getWalletConnectVerifyStatus(verifyContext);
  const risky = isRiskyVerifyStatus(status);
  const {label, detail} = describe(status, origin, appUrl);
  const Icon = risky
    ? GppMaybeOutlinedIcon
    : status === 'verified'
      ? VerifiedUserOutlinedIcon
      : ShieldOutlinedIcon;
  const tone = risky ? s.danger : status === 'verified' ? s.verified : s.muted;

  return (
    <div className={`${s.box} ${risky ? s.riskyBox : ''}`}>
      <div className={`${s.row} ${tone}`}>
        <Icon sx={{fontSize: 18}} />
        <span className={s.label}>{label}</span>
      </div>
      {!!detail && (
        <p className={`${s.detail} ${risky ? s.danger : ''}`}>{detail}</p>
      )}
      {risky && !!onToggleAcknowledged && (
        <label className={s.checkboxRow}>
          <input
            type='checkbox'
            checked={!!acknowledged}
            onChange={onToggleAcknowledged}
          />
          <span>I understand the risk and want to continue</span>
        </label>
      )}
    </div>
  );
};

export default WalletConnectVerifyBadge;
