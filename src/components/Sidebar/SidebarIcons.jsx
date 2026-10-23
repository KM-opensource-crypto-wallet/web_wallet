import React from 'react';

// Line icons used in the sidebar (24px grid, stroke follows currentColor).
const Svg = ({size = 20, strokeWidth = 1.9, children, ...rest}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={strokeWidth}
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
    {...rest}>
    {children}
  </svg>
);

export const HomeIcon = props => (
  <Svg {...props}>
    <path d='M3 10.5L12 3l9 7.5' />
    <path d='M5 9v11h5v-6h4v6h5V9' />
  </Svg>
);

export const BuyIcon = props => (
  <Svg {...props}>
    <rect x='2.5' y='5.5' width='19' height='13' rx='2.2' />
    <path d='M2.5 9.8h19' />
    <path d='M6 14.5h4' />
  </Svg>
);

export const SellIcon = props => (
  <Svg {...props}>
    <path d='M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z' />
    <circle cx='7.5' cy='7.5' r='1.3' />
  </Svg>
);

export const SwapIcon = props => (
  <Svg {...props}>
    <path d='M17 3l4 4-4 4' />
    <path d='M21 7H8a4 4 0 0 0-4 4' />
    <path d='M7 21l-4-4 4-4' />
    <path d='M3 17h13a4 4 0 0 0 4-4' />
  </Svg>
);

export const WalletIcon = props => (
  <Svg {...props}>
    <path d='M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3' />
    <path d='M3 5a2 2 0 0 0 2 2h16v5' />
    <path d='M21 12h-4a2 2 0 0 0 0 4h4v-4z' />
  </Svg>
);

// WalletConnect.png is the full 1200x675 wordmark; crop to its logo mark
// (x 107-368, y 231-390) so it stays legible at icon size.
const WalletConnectLogo = require('assets/images/WalletConnect.png').default;
const WC_MARK = {x: 107, y: 231, width: 262, height: 160};
const WC_IMAGE = {width: 1200, height: 675};

export const WalletConnectIcon = ({size = 22}) => {
  const scale = size / WC_MARK.width;
  return (
    <span
      aria-hidden='true'
      style={{
        display: 'block',
        width: size,
        height: WC_MARK.height * scale,
        backgroundImage: `url(${WalletConnectLogo?.src || WalletConnectLogo})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${WC_IMAGE.width * scale}px ${WC_IMAGE.height * scale}px`,
        backgroundPosition: `${-WC_MARK.x * scale}px ${-WC_MARK.y * scale}px`,
      }}
    />
  );
};

export const AboutIcon = props => (
  <Svg {...props}>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 16v-4.5' />
    <path d='M12 8h.01' />
  </Svg>
);

export const ContactIcon = props => (
  <Svg {...props}>
    <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
  </Svg>
);

export const SettingsIcon = props => (
  <Svg {...props}>
    <circle cx='12' cy='12' r='3' />
    <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' />
  </Svg>
);

export const PaymentUrlIcon = props => (
  <Svg {...props}>
    <rect x='3' y='3' width='7' height='7' rx='1.5' />
    <rect x='14' y='3' width='7' height='7' rx='1.5' />
    <rect x='3' y='14' width='7' height='7' rx='1.5' />
    <path d='M14 14h3v3h-3z' />
    <path d='M21 14v.01M21 21h-4v-4M14 21v.01' />
  </Svg>
);

export const ResetIcon = props => (
  <Svg {...props}>
    <path d='M3 12a9 9 0 1 0 3-6.7L3 8' />
    <path d='M3 3v5h5' />
  </Svg>
);

export const LogoutIcon = props => (
  <Svg {...props}>
    <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
    <path d='M16 17l5-5-5-5' />
    <path d='M21 12H9' />
  </Svg>
);

export const ProfileIcon = props => (
  <Svg {...props}>
    <circle cx='12' cy='8' r='4' />
    <path d='M4 21a8 8 0 0 1 16 0' />
  </Svg>
);

export const ChevronDownIcon = props => (
  <Svg {...props}>
    <path d='M6 9l6 6 6-6' />
  </Svg>
);
