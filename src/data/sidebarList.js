import {walletRoutes} from 'utils/routes';

const icons = require(`assets/images/sidebarIcons`).default;

// Wallet-scoped entries need the active wallet's id in the URL, so the list
// is built per-render rather than exported as static data.
const sidebarList = currentWalletClientId => [
  {
    key: 'home',
    href: walletRoutes.home(currentWalletClientId),
    item: t => (
      <>
        {icons.home} <span>{t('home')}</span>
      </>
    ),
  },
  {
    key: 'buyCrypto',
    href: walletRoutes.buyCrypto(currentWalletClientId),
    item: t => (
      <>
        {icons.buy}
        <span>{t('buyCrypto')}</span>
      </>
    ),
  },
  {
    key: 'swap',
    href: walletRoutes.swap(currentWalletClientId),
    item: t => (
      <>
        {icons.exchange}
        <span>{t('swap')}</span>
      </>
    ),
  },
  {
    key: 'sellCrypto',
    href: walletRoutes.sellCrypto(currentWalletClientId),
    item: t => (
      <>
        {icons.buy}
        <span>{t('sellCrypto')}</span>
      </>
    ),
  },
  {
    key: 'wallets',
    href: '/wallets',
    item: t => (
      <>
        {icons.wallet}
        <span>{t('wallets')}</span>
      </>
    ),
  },
  {
    key: 'walletConnect',
    href: walletRoutes.walletConnect(currentWalletClientId),
    item: t => (
      <>
        {icons.walletConnect}
        <span>{t('walletConnect')}</span>
      </>
    ),
  },
  {
    key: 'about',
    href: '/about',
    item: t => (
      <>
        {icons.about}
        <span>{t('about')}</span>
      </>
    ),
  },
  {
    key: 'contactUs',
    href: '/contact-us',
    item: t => (
      <>
        {icons.contactUs}
        <span>{t('contactUs')}</span>
      </>
    ),
  },
  {
    key: 'settings',
    href: '/settings',
    item: t => (
      <>
        {icons.settings}
        <span>{t('settings')}</span>
      </>
    ),
  },
  {
    key: 'receivePaymentUrl',
    href: walletRoutes.receivePaymentUrl(currentWalletClientId),
    item: t => (
      <>
        {icons.url}
        <span>{t('receivePaymentUrl')}</span>
      </>
    ),
  },
  {
    key: 'resetWallet',
    href: '/reset-wallet',
    item: t => (
      <>
        {icons.walletReset}
        <span>{t('resetWallet')}</span>
      </>
    ),
  },
  {
    key: 'logout',
    href: '/logout',
    item: t => (
      <>
        {icons.logout}
        <span>{t('logout')}</span>
      </>
    ),
  },
];

export default sidebarList;
