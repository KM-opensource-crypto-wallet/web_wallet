import {walletRoutes} from 'utils/routes';
import {
  AboutIcon,
  BuyIcon,
  ContactIcon,
  HomeIcon,
  LogoutIcon,
  PaymentUrlIcon,
  ResetIcon,
  SellIcon,
  SettingsIcon,
  SwapIcon,
  WalletConnectIcon,
  WalletIcon,
} from 'components/Sidebar/SidebarIcons';

// Wallet-scoped entries need the active wallet's id in the URL, so the list
// is built per-render rather than exported as static data. `key` doubles as
// the `home` translation key; `section` groups the entries in the sidebar.
const sidebarList = currentWalletClientId => [
  {
    key: 'home',
    href: walletRoutes.home(currentWalletClientId),
    Icon: HomeIcon,
    section: 'wallet',
  },
  {
    key: 'buyCrypto',
    href: walletRoutes.buyCrypto(currentWalletClientId),
    Icon: BuyIcon,
    section: 'wallet',
  },
  {
    key: 'swap',
    href: walletRoutes.swap(currentWalletClientId),
    Icon: SwapIcon,
    section: 'wallet',
  },
  {
    key: 'sellCrypto',
    href: walletRoutes.sellCrypto(currentWalletClientId),
    Icon: SellIcon,
    section: 'wallet',
  },
  {key: 'wallets', href: '/wallets', Icon: WalletIcon, section: 'wallet'},
  {
    key: 'walletConnect',
    href: walletRoutes.walletConnect(currentWalletClientId),
    Icon: WalletConnectIcon,
    section: 'wallet',
  },
  {
    key: 'receivePaymentUrl',
    href: walletRoutes.receivePaymentUrl(currentWalletClientId),
    Icon: PaymentUrlIcon,
    section: 'wallet',
  },
  {key: 'settings', href: '/settings', Icon: SettingsIcon, section: 'general'},
  {key: 'about', href: '/about', Icon: AboutIcon, section: 'general'},
  {
    key: 'contactUs',
    href: '/contact-us',
    Icon: ContactIcon,
    section: 'general',
  },
  {
    key: 'resetWallet',
    href: '/reset-wallet',
    Icon: ResetIcon,
    section: 'account',
  },
  {key: 'logout', href: '/logout', Icon: LogoutIcon, section: 'account'},
];

export default sidebarList;
