const icons = require(`assets/images/sidebarIcons`).default;

// Wallet-scoped entries need the active wallet's id in the URL, so the list
// is built per-render rather than exported as static data.
const sidebarList = currentWalletClientId => [
  {
    key: 'home',
    href: `/wallet/${currentWalletClientId}/home`,
    item: t => (
      <>
        {icons.home} <span>{t('home')}</span>
      </>
    ),
  },
  {
    key: 'buyCrypto',
    href: `/wallet/${currentWalletClientId}/buy-crypto`,
    item: t => (
      <>
        {icons.buy}
        <span>{t('buyCrypto')}</span>
      </>
    ),
  },
  {
    key: 'swap',
    href: `/wallet/${currentWalletClientId}/swap`,
    item: t => (
      <>
        {icons.exchange}
        <span>{t('swap')}</span>
      </>
    ),
  },
  {
    key: 'sellCrypto',
    href: `/wallet/${currentWalletClientId}/sell-crypto`,
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
    href: `/wallet/${currentWalletClientId}/wallet-connect`,
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
    href: `/wallet/${currentWalletClientId}/receive-payment-url`,
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
