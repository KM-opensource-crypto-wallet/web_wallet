// Extension auto-lock labels. 0 keeps no unlock session (see
// src/extension/session.js), so the wallet locks whenever its side panel or
// tab closes; the other values also keep it unlocked across reopening for
// that long after the last activity. Stored values are unchanged.
import {AUTO_LOCK} from 'dok-wallet-blockchain-networks/helper';

export const WEB_AUTO_LOCK = AUTO_LOCK.map(option =>
  option.value === 0 ? {...option, label: 'When the wallet is closed'} : option,
);

export const getWebLockTimeLabel = lockTime =>
  WEB_AUTO_LOCK.find(option => option.value === lockTime)?.label || '';
