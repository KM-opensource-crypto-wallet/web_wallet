'use client';

import React, {useEffect, useRef, useState} from 'react';
import s from './RateRefreshCountdown.module.css';

export const QUOTE_REFRESH_INTERVAL_MS = 60 * 1000;

// Small "↻ 24s" pill next to the provider header. Counts down from the
// last quote fetch and calls onRefresh at zero (or on click). Pausing
// (while a request is in flight or an approval modal is open) freezes the
// timer.
const RateRefreshCountdown = ({fetchedAt, paused = false, onRefresh}) => {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!fetchedAt || paused) {
      return undefined;
    }
    const tick = () => {
      const elapsed = Date.now() - fetchedAt;
      const left = Math.ceil((QUOTE_REFRESH_INTERVAL_MS - elapsed) / 1000);
      if (left <= 0) {
        setSecondsLeft(0);
        onRefreshRef.current?.();
      } else {
        setSecondsLeft(left);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [fetchedAt, paused]);

  if (!fetchedAt) {
    return null;
  }

  return (
    <button
      type='button'
      className={s.pill}
      onClick={() => onRefreshRef.current?.()}
      aria-label='Refresh quotes now'>
      {paused || secondsLeft === null ? '↻' : `↻ ${secondsLeft}s`}
    </button>
  );
};

export default RateRefreshCountdown;
