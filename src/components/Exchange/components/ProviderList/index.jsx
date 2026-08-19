'use client';

import React from 'react';
import {CircularProgress} from '@mui/material';
import ProviderCard from '../ProviderCard';
import RateRefreshCountdown from '../RateRefreshCountdown';
import s from './ProviderList.module.css';

// The provider comparison section: header with count + refresh countdown,
// then one ProviderCard per provider. Also owns the section's loading,
// error (with retry) and empty states.
const ProviderList = ({
  rows,
  isFetching,
  error,
  onRetry,
  onPressProvider,
  fromSymbol,
  toSymbol,
  fiatSymbol,
  quoteFetchedAt,
  refreshPaused,
  onRefresh,
}) => {
  const usableCount = rows.filter(
    row => row.toAmount && !row.isBelowMinimum,
  ).length;

  return (
    <div className={s.container}>
      <div className={s.headerRow}>
        <p className={s.headerTitle}>
          {rows.length
            ? `Providers (${usableCount} of ${rows.length} available)`
            : 'Providers'}
        </p>
        {!!quoteFetchedAt && !error && (
          <RateRefreshCountdown
            fetchedAt={quoteFetchedAt}
            paused={refreshPaused || isFetching}
            onRefresh={onRefresh}
          />
        )}
      </div>
      {isFetching && !rows.length ? (
        <div className={s.stateBox}>
          <CircularProgress size={20} sx={{color: 'var(--background)'}} />
          <p className={s.stateText}>Fetching quotes…</p>
        </div>
      ) : error ? (
        <div className={s.stateBox}>
          <p className={s.errorText}>
            {"Couldn't fetch quotes. Check your connection and try again."}
          </p>
          <button type='button' className={s.retryButton} onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : rows.length ? (
        rows.map(row => (
          <ProviderCard
            key={row.providerName}
            row={row}
            fromSymbol={fromSymbol}
            toSymbol={toSymbol}
            fiatSymbol={fiatSymbol}
            onPress={onPressProvider}
          />
        ))
      ) : (
        <div className={s.stateBox}>
          <p className={s.stateText}>
            No provider supports this pair yet. Try a different coin or network.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProviderList;
