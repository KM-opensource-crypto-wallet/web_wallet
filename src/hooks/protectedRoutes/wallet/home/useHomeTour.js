import {useEffect} from 'react';
import {driver} from 'driver.js';
import 'driver.js/dist/driver.css';
import {HOME_TOUR_KEY} from 'src/data/constants';

// App navigation: desktop header links, the profile menu, and on phones the
// burger that opens the drawer. Only the ones on screen become steps.
const NAV_STEPS = [
  {
    element: '[data-tour="nav-home"]',
    popover: {
      title: 'Home',
      description: 'Come back here any time to see your balance and assets.',
    },
  },
  {
    element: '[data-tour="nav-buyCrypto"]',
    popover: {
      title: 'Buy Crypto',
      description: 'Buy crypto through our partner providers.',
    },
  },
  {
    element: '[data-tour="nav-swap"]',
    popover: {
      title: 'Swap',
      description: 'Exchange one coin for another.',
    },
  },
  {
    element: '[data-tour="nav-sellCrypto"]',
    popover: {
      title: 'Sell Crypto',
      description: 'Sell your crypto for fiat money.',
    },
  },
  {
    element: '[data-tour="nav-wallets"]',
    popover: {
      title: 'Wallets',
      description: 'Manage your wallets, create a new one or import one.',
    },
  },
  {
    element: '[data-tour="nav-walletConnect"]',
    popover: {
      title: 'Wallet Connect',
      description: 'Connect your wallet to dApps and approve their requests.',
    },
  },
  {
    element: '[data-tour="nav-profile"]',
    popover: {
      title: 'Account menu',
      description:
        'Settings, payment URLs, about, contact us, reset wallet and log out.',
    },
  },
  {
    element: '.bm-burger-button',
    popover: {
      title: 'Menu',
      description:
        'Open the menu to buy, swap or sell crypto, manage wallets, connect to dApps and change settings.',
    },
  },
];

const HOME_STEPS = [
  {
    element: '[data-tour="wallet"]',
    popover: {
      title: 'Your wallets',
      description: 'Tap here to switch between wallets or add a new one.',
    },
  },
  {
    element: '[data-tour="balance"]',
    popover: {
      title: 'Total balance',
      description:
        'See your total balance, hide it with the eye icon, and send, receive or swap with the quick actions.',
    },
  },
  {
    element: '[data-tour="search"]',
    popover: {
      title: 'Find your assets',
      description: 'Search your coins by name or sort them the way you like.',
    },
  },
  {
    element: '[data-tour="more-coins"]',
    popover: {
      title: 'Add more coins',
      description: 'Pick more coins and tokens to show in this wallet.',
    },
  },
];

const isOnScreen = selector => {
  const el = document.querySelector(selector);
  return !!el && el.getClientRects().length > 0;
};

const hasSeenTour = () => {
  try {
    return window.localStorage.getItem(HOME_TOUR_KEY) === '1';
  } catch {
    return true;
  }
};

const markTourSeen = () => {
  try {
    window.localStorage.setItem(HOME_TOUR_KEY, '1');
  } catch {
    // Storage unavailable: the tour may show again next visit.
  }
};

// First-visit walkthrough of the home screen. Waits for `enabled` (store
// loaded, no modal open) so the steps point at what is really on screen.
export const useHomeTour = enabled => {
  useEffect(() => {
    if (!enabled || hasSeenTour()) {
      return;
    }
    let tour;
    const timer = setTimeout(() => {
      tour = driver({
        showProgress: true,
        allowClose: true,
        popoverClass: 'home-tour',
        steps: [...NAV_STEPS, ...HOME_STEPS].filter(step =>
          isOnScreen(step.element),
        ),
        onDestroyed: markTourSeen,
      });
      tour.drive();
    }, 1500);
    return () => {
      clearTimeout(timer);
      tour?.destroy();
    };
  }, [enabled]);
};

export default useHomeTour;
