const icons = require(`assets/images/connect`).default;

const walletConnect = [
  {
    name: 'accounts',
    icon: <>{icons.accounts}</>,
  },
  {
    name: 'sessions',
    icon: <>{icons.sessions}</>,
  },

  {
    name: 'wallet_connect_logo',
    icon: <>{icons.wallet_connect_logo}</>,
    isActive: 'true',
  },
  {
    name: 'pairings',
    icon: <>{icons.pairings}</>,
  },
  {
    name: 'settings',
    icon: <>{icons.settings}</>,
  },
];

export default walletConnect;
