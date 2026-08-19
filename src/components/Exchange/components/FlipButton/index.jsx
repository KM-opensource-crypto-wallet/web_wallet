'use client';

import React from 'react';
import s from './FlipButton.module.css';

const icons = require('assets/images/icons').default;

// Circular button overlapping the seam between the two swap cards; swaps
// the from/to sides (coins AND amounts).
const FlipButton = ({onPress}) => {
  return (
    <div className={s.wrapper}>
      <button
        type='button'
        className={s.button}
        onClick={onPress}
        aria-label='Swap the pay and receive coins'>
        {icons.sCurved}
      </button>
    </div>
  );
};

export default FlipButton;
