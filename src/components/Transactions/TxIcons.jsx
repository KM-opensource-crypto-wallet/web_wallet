import React from 'react';

// Line icons for the transaction history (24px grid, stroke follows
// currentColor), drawn from the Transaction History design.
const Svg = ({size = 19, strokeWidth = 2, children, ...rest}) => (
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

export const ArrowDownIcon = props => (
  <Svg {...props}>
    <path d='M12 5v14' />
    <path d='M6 13l6 6 6-6' />
  </Svg>
);

export const ArrowUpIcon = props => (
  <Svg {...props}>
    <path d='M12 19V5' />
    <path d='M6 11l6-6 6 6' />
  </Svg>
);

export const TrendUpIcon = props => (
  <Svg {...props}>
    <path d='M3 17l6-6 4 4 7-7' />
    <path d='M17 8h4v4' />
  </Svg>
);

export const TrendDownIcon = props => (
  <Svg {...props}>
    <path d='M3 7l6 6 4-4 7 7' />
    <path d='M21 16v-4h-4' />
  </Svg>
);

export const ContractIcon = props => (
  <Svg {...props}>
    <path d='M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2' />
    <path d='M9 9h6' />
    <path d='M9 13h6' />
    <path d='M9 17h3' />
  </Svg>
);

export const ShieldIcon = props => (
  <Svg {...props}>
    <path d='M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z' />
    <path d='M12 11v3' />
  </Svg>
);

export const LayersIcon = props => (
  <Svg {...props}>
    <path d='M12 3 4 7l8 4 8-4-8-4z' />
    <path d='M4 12l8 4 8-4' />
    <path d='M4 17l8 4 8-4' />
  </Svg>
);

export const ImageIcon = props => (
  <Svg {...props}>
    <rect x='3' y='3' width='18' height='18' rx='3' />
    <circle cx='9' cy='9' r='2' />
    <path d='M21 15l-5-5L5 21' />
  </Svg>
);

export const CheckCircleIcon = props => (
  <Svg {...props}>
    <path d='M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z' />
    <path d='M8.5 12l2.5 2.5 4.5-5' />
  </Svg>
);

export const ListIcon = props => (
  <Svg {...props}>
    <path d='M4 7h16' />
    <path d='M4 12h16' />
    <path d='M4 17h16' />
  </Svg>
);

export const ClockIcon = props => (
  <Svg {...props}>
    <path d='M12 7v5l3.5 2' />
    <path d='M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z' />
  </Svg>
);

export const EyeOffIcon = props => (
  <Svg {...props}>
    <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z' />
    <path d='M4 20L20 4' />
  </Svg>
);

export const SlidersIcon = props => (
  <Svg {...props}>
    <path d='M4 6h10' />
    <path d='M18 6h2' />
    <circle cx='16' cy='6' r='2' />
    <path d='M4 12h4' />
    <path d='M12 12h8' />
    <circle cx='10' cy='12' r='2' />
    <path d='M4 18h12' />
    <path d='M20 18h0' />
    <circle cx='18' cy='18' r='2' />
  </Svg>
);

export const SortIcon = props => (
  <Svg {...props}>
    <path d='M7 4v16' />
    <path d='M3 16l4 4 4-4' />
    <path d='M17 20V4' />
    <path d='M13 8l4-4 4 4' />
  </Svg>
);

export const ResetIcon = props => (
  <Svg {...props}>
    <path d='M3 12a9 9 0 1 0 3-6.7' />
    <path d='M3 4v5h5' />
  </Svg>
);

export const TrashIcon = props => (
  <Svg {...props}>
    <path d='M4 7h16' />
    <path d='M10 11v6' />
    <path d='M14 11v6' />
    <path d='M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12' />
    <path d='M9 7V4h6v3' />
  </Svg>
);

export const BoltIcon = props => (
  <Svg {...props}>
    <path d='M13 2L4 14h7l-1 8 9-12h-7l1-8z' />
  </Svg>
);

export const EmptyIcon = props => (
  <Svg strokeWidth={1.8} {...props}>
    <path d='M4 13h4l2 3h4l2-3h4' />
    <path d='M5.5 6.5 4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5l-1.5-6.5A2 2 0 0 0 16.6 5H7.4a2 2 0 0 0-1.9 1.5z' />
  </Svg>
);

export const PowerIcon = props => (
  <Svg {...props}>
    <path d='M12 3v8' />
    <path d='M6.3 7.3a8 8 0 1 0 11.4 0' />
  </Svg>
);

export const StarIcon = props => (
  <Svg {...props}>
    <path d='M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z' />
  </Svg>
);

export const ExternalLinkIcon = props => (
  <Svg {...props}>
    <path d='M14 4h6v6' />
    <path d='M20 4l-9 9' />
    <path d='M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4' />
  </Svg>
);
