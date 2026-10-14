import {
  BuyIcon,
  ReceiveIcon,
  SendIcon,
  SwapIcon,
} from 'components/Home/HomeIcons';

// Quick-action buttons on the Home screen. Click handlers are attached by
// `key` in components/Home, which also hides entries that are unavailable.
export const HOME_ACTIONS = [
  {key: 'send', label: 'Send', Icon: SendIcon},
  {key: 'receive', label: 'Receive', Icon: ReceiveIcon},
  {key: 'buy', label: 'Buy', Icon: BuyIcon},
  {key: 'swap', label: 'Swap', Icon: SwapIcon},
];
