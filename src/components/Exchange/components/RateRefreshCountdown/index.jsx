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
  // fetchedAt value the expiry callback already fired for — keeps a stale
  // quote (e.g. after a failed refresh) from re-firing onRefresh every tick.
  const expiredForRef = useRef(null);

  useEffect(() => {
    if (!fetchedAt || paused) {
      return undefined;
    }
    // (Re)starting the countdown — new quote or resumed from pause — arms
    // one expiry callback for this run.
    expiredForRef.current = null;
    let interval = null;
    const tick = () => {
      const elapsed = Date.now() - fetchedAt;
      const left = Math.ceil((QUOTE_REFRESH_INTERVAL_MS - elapsed) / 1000);
      if (left <= 0) {
        setSecondsLeft(0);
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        if (expiredForRef.current !== fetchedAt) {
          expiredForRef.current = fetchedAt;
          onRefreshRef.current?.();
        }
        return;
      }
      setSecondsLeft(left);
    };
    tick();
    if (expiredForRef.current !== fetchedAt) {
      interval = setInterval(tick, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
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
