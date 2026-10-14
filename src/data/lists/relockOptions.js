import {RELOCK_OPTIONS} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';

// Re-hide choices on the Hide wallet screen, shown as radios. The hook matches
// a picked option back to its RELOCK_OPTIONS value by `label`.
export const RELOCK_OPTIONS_UI = [
  {
    label: 'On page refresh (default)',
    hint: 'Hidden again whenever the app reloads',
    value: RELOCK_OPTIONS.RELAUNCH,
  },
  {
    label: 'Manual only',
    hint: 'Stays visible until you hide it again',
    value: RELOCK_OPTIONS.MANUAL,
  },
];
