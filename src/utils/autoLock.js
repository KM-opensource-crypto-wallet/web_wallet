import {AUTO_LOCK} from 'dok-wallet-blockchain-networks/helper';

// Web labels for the shared AUTO_LOCK values. The vault key lives only in
// memory, so every page reload already asks for the password; the value only
// sets the idle timeout within an open tab. 0 means no idle timeout, which
// mobile's "Immediate" label would misdescribe here. Stored values unchanged.
export const WEB_AUTO_LOCK = AUTO_LOCK.map(option =>
  option.value === 0 ? {...option, label: 'Only on page reload'} : option,
);

export const getWebLockTimeLabel = lockTime =>
  WEB_AUTO_LOCK.find(option => option.value === lockTime)?.label || '';
