import React from 'react';

// Line icons used on Home (24px grid, stroke follows currentColor).
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

export const SendIcon = props => (
  <Svg {...props}>
    <path d='M12 19V5' />
    <path d='M6 11l6-6 6 6' />
  </Svg>
);

export const ReceiveIcon = props => (
  <Svg {...props}>
    <path d='M12 5v14' />
    <path d='M6 13l6 6 6-6' />
  </Svg>
);

export const BuyIcon = props => (
  <Svg {...props}>
    <rect x='2.5' y='5.5' width='19' height='13' rx='2.2' />
    <path d='M2.5 9.8h19' />
    <path d='M6 14.5h4' />
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

export const SearchIcon = props => (
  <Svg {...props}>
    <circle cx='11' cy='11' r='7' />
    <path d='M21 21l-4.3-4.3' />
  </Svg>
);

export const ChevronDownIcon = props => (
  <Svg strokeWidth={2.2} {...props}>
    <path d='M6 9l6 6 6-6' />
  </Svg>
);

export const ChevronLeftIcon = props => (
  <Svg strokeWidth={2.2} {...props}>
    <path d='M15 18l-6-6 6-6' />
  </Svg>
);

export const ChevronRightIcon = props => (
  <Svg strokeWidth={2.2} {...props}>
    <path d='M9 6l6 6-6 6' />
  </Svg>
);

export const EyeIcon = ({off, ...props}) => (
  <Svg {...props}>
    <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z' />
    <circle cx='12' cy='12' r='3' />
    {off ? <line x1='4' y1='20' x2='20' y2='4' /> : null}
  </Svg>
);

export const PlusIcon = props => (
  <Svg strokeWidth={2.4} {...props}>
    <path d='M12 5v14' />
    <path d='M5 12h14' />
  </Svg>
);

export const CheckIcon = props => (
  <Svg strokeWidth={3} {...props}>
    <path d='M20 6 9 17l-5-5' />
  </Svg>
);

export const CopyIcon = props => (
  <Svg {...props}>
    <rect x='9' y='9' width='12' height='12' rx='2.5' />
    <path d='M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1' />
  </Svg>
);

export const InfoIcon = props => (
  <Svg {...props}>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 16v-4.5' />
    <path d='M12 8h.01' />
  </Svg>
);

export const HistoryIcon = props => (
  <Svg {...props}>
    <path d='M3 12a9 9 0 1 0 3-6.7L3 8' />
    <path d='M3 3v5h5' />
    <path d='M12 7v5l3 2' />
  </Svg>
);

export const KeyIcon = props => (
  <Svg {...props}>
    <circle cx='7.5' cy='15.5' r='4.5' />
    <path d='M10.7 12.3L21 2' />
    <path d='M16 7l3 3' />
    <path d='M18.5 4.5l2 2' />
  </Svg>
);

export const StakingIcon = props => (
  <Svg {...props}>
    <path d='M12 2L2 7l10 5 10-5-10-5z' />
    <path d='M2 17l10 5 10-5' />
    <path d='M2 12l10 5 10-5' />
  </Svg>
);

export const SortIcon = props => (
  <Svg {...props}>
    <path d='M3 6h18' />
    <path d='M6 12h12' />
    <path d='M10 18h4' />
  </Svg>
);

export const SettingsIcon = props => (
  <Svg {...props}>
    <circle cx='12' cy='12' r='3' />
    <path d='M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z' />
  </Svg>
);

export const CloseIcon = props => (
  <Svg strokeWidth={2.4} {...props}>
    <path d='M18 6L6 18' />
    <path d='M6 6l12 12' />
  </Svg>
);

export const QrIcon = props => (
  <Svg {...props}>
    <rect x='3' y='3' width='7' height='7' rx='1' />
    <rect x='14' y='3' width='7' height='7' rx='1' />
    <rect x='3' y='14' width='7' height='7' rx='1' />
    <path d='M14 14h3v3' />
    <path d='M21 14v7h-7' />
  </Svg>
);

export const UnlinkIcon = props => (
  <Svg {...props}>
    <path d='M18.4 18.4A9 9 0 0 1 5.6 5.6' />
    <path d='M21 12a9 9 0 0 0-9-9' />
    <path d='M3 3l18 18' />
  </Svg>
);

export const RowsIcon = props => (
  <Svg {...props}>
    <path d='M4 7h16' />
    <path d='M4 12h16' />
    <path d='M4 17h16' />
    <path d='M8 4v6' />
    <path d='M16 14v6' />
  </Svg>
);

export const BranchIcon = props => (
  <Svg {...props}>
    <path d='M9 3v6a3 3 0 0 0 3 3h3a3 3 0 0 1 3 3v6' />
  </Svg>
);
