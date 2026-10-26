import React from 'react';

// Line icons for Contact us (24px grid, stroke follows currentColor), matching
// components/Home/HomeIcons.
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

export const MailIcon = props => (
  <Svg {...props}>
    <rect x='3' y='5' width='18' height='14' rx='2.5' />
    <path d='M3.5 7l8.5 6 8.5-6' />
  </Svg>
);

export const TelegramIcon = props => (
  <Svg {...props}>
    <path d='M21.5 4.5L2.5 11.8l6 2.2 2.3 6.5 3.4-4.4 4.8 3.6z' />
    <path d='M8.5 14l9-7.5' />
  </Svg>
);
