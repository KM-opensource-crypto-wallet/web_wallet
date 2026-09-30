'use client';
import React from 'react';
import {MIGRATION_ERROR_CODES} from 'redux/storage/migrateLegacyRoot';

// Shown by StateProvider when the storage bootstrap fails. No dependency on
// the redux store or the theme: neither is available yet.
const messageFor = error => {
  switch (error?.code) {
    case MIGRATION_ERROR_CODES.PARSE:
    case MIGRATION_ERROR_CODES.DECRYPT:
    case MIGRATION_ERROR_CODES.VERIFY:
      return (
        'Your stored wallet data could not be upgraded. Nothing has been ' +
        'changed or deleted. Please try again; if this keeps happening, ' +
        'contact support before resetting anything.'
      );
    case 'unavailable':
      return (
        'Browser storage is not available. This can happen in a private ' +
        'window or when site data is blocked. Allow storage for this site ' +
        'and try again.'
      );
    default:
      return 'Local storage could not be opened. Please try again.';
  }
};

const StorageErrorScreen = ({error, onRetry}) => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
      color: '#111',
      background: '#fff',
    }}>
    <h1 style={{fontSize: 20, marginBottom: 12}}>Storage problem</h1>
    <p style={{maxWidth: 480, lineHeight: 1.5}}>{messageFor(error)}</p>
    {error?.code ? (
      <p style={{fontSize: 12, color: '#777'}}>Code: {error.code}</p>
    ) : null}
    <button
      type='button'
      onClick={onRetry}
      style={{
        marginTop: 24,
        padding: '10px 24px',
        borderRadius: 8,
        border: 0,
        background: '#111',
        color: '#fff',
        fontSize: 15,
        cursor: 'pointer',
      }}>
      Try again
    </button>
  </div>
);

export default StorageErrorScreen;
