import React from 'react';

// Line icons for the Settings list (24px grid, stroke follows currentColor),
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

export const CurrencyIcon = props => (
  <Svg {...props}>
    <circle cx='12' cy='12' r='9' />
    <path d='M15 9.2c-.5-1-1.6-1.7-3-1.7-1.8 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.5 0-2.6-.7-3.1-1.7' />
    <path d='M12 6v1.5M12 16.5V18' />
  </Svg>
);

export const CoinsIcon = props => (
  <Svg {...props}>
    <ellipse cx='9' cy='7' rx='6' ry='3' />
    <path d='M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7' />
    <path d='M9 18c-3.3 0-6-1.3-6-3' />
    <path d='M15 12.2c3.1.2 6 1.4 6 2.8v3c0 1.7-2.7 3-6 3-1.7 0-3.2-.3-4.3-.9' />
  </Svg>
);

export const PaletteIcon = props => (
  <Svg {...props}>
    <path d='M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z' />
    <circle cx='7.5' cy='11.5' r='1' />
    <circle cx='10.5' cy='7.5' r='1' />
    <circle cx='15.5' cy='8.5' r='1' />
  </Svg>
);

export const LockIcon = props => (
  <Svg {...props}>
    <rect x='4' y='10.5' width='16' height='10.5' rx='2.5' />
    <path d='M8 10.5V7a4 4 0 0 1 8 0v3.5' />
  </Svg>
);

export const TimerIcon = props => (
  <Svg {...props}>
    <circle cx='12' cy='13' r='8' />
    <path d='M12 9v4l2.5 1.5' />
    <path d='M10 2h4' />
  </Svg>
);

export const PhraseIcon = props => (
  <Svg {...props}>
    <rect x='3' y='5' width='18' height='14' rx='2.5' />
    <path d='M7 10h4M13 10h4M7 14h4M13 14h4' />
  </Svg>
);

export const GlobeIcon = props => (
  <Svg {...props}>
    <circle cx='12' cy='12' r='9' />
    <path d='M3 12h18' />
    <path d='M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z' />
  </Svg>
);

export const PlayIcon = props => (
  <Svg {...props}>
    <rect x='3' y='5' width='18' height='14' rx='3' />
    <path d='M10 9.2v5.6l4.6-2.8z' />
  </Svg>
);

export const DocIcon = props => (
  <Svg {...props}>
    <path d='M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z' />
    <path d='M14 3v5h5' />
    <path d='M9 13h6M9 17h4' />
  </Svg>
);

export const ShieldIcon = props => (
  <Svg {...props}>
    <path d='M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z' />
    <path d='M9 12l2 2 4-4' />
  </Svg>
);

export const CloudUpIcon = props => (
  <Svg {...props}>
    <path d='M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9' />
    <path d='M12 21v-8M9 15.5l3-3 3 3' />
  </Svg>
);

export const CloudDownIcon = props => (
  <Svg {...props}>
    <path d='M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9' />
    <path d='M12 12v8M9 17.5l3 3 3-3' />
  </Svg>
);

export const ServerIcon = props => (
  <Svg {...props}>
    <rect x='3' y='4' width='18' height='7' rx='2' />
    <rect x='3' y='13' width='18' height='7' rx='2' />
    <path d='M7 7.5h.01M7 16.5h.01' />
  </Svg>
);

export const BranchesIcon = props => (
  <Svg {...props}>
    <circle cx='6' cy='5' r='2' />
    <circle cx='6' cy='19' r='2' />
    <circle cx='18' cy='8' r='2' />
    <path d='M6 7v10' />
    <path d='M18 10c0 4-6 3-11.5 7.5' />
  </Svg>
);

export const ResetIcon = props => (
  <Svg {...props}>
    <path d='M3 12a9 9 0 1 0 3-6.7L3 8' />
    <path d='M3 3v5h5' />
  </Svg>
);

export const EyeOffIcon = props => (
  <Svg {...props}>
    <path d='M10.6 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.4 3.3' />
    <path d='M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6' />
    <path d='M9.9 9.9a3 3 0 0 0 4.2 4.2' />
    <path d='M3 3l18 18' />
  </Svg>
);

export const BugIcon = props => (
  <Svg {...props}>
    <rect x='7' y='7' width='10' height='13' rx='5' />
    <path d='M9 7.5V6a3 3 0 0 1 6 0v1.5' />
    <path d='M3 13h4M17 13h4M4 8l3 2M20 8l-3 2M4 19l3-2M20 19l-3-2' />
  </Svg>
);
