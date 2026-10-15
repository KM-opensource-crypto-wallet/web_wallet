import React from 'react';

// Line icons for the Custom RPC list (24px grid, stroke follows currentColor),
// matching components/Home/HomeIcons.
const Svg = ({size = 20, strokeWidth = 2, children, ...rest}) => (
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

export const MoreIcon = props => (
  <Svg strokeWidth={2.6} {...props}>
    <path d='M12 5h.01M12 12h.01M12 19h.01' />
  </Svg>
);

export const EditIcon = props => (
  <Svg {...props}>
    <path d='M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z' />
    <path d='M13.5 6.5l4 4' />
  </Svg>
);

export const WalletIcon = props => (
  <Svg {...props}>
    <path d='M4 7a2 2 0 0 1 2-2h11v4' />
    <rect x='4' y='7' width='16' height='13' rx='2.5' />
    <path d='M16 13.5h.01' />
  </Svg>
);
