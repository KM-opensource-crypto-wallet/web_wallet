import React from 'react';
import styles from './Button.module.css';

export const GeneralButton = ({
  variant = 'primary',
  type = 'button',
  loading = false,
  loadingLabel,
  disabled = false,
  fullWidth = false,
  className,
  onClick,
  children,
  ...buttonProps
}) => {
  // 'unstyled' skips the button look entirely; `className` styles it.
  const classes =
    variant === 'unstyled'
      ? [fullWidth ? styles.fullWidth : '', className || ''].join(' ')
      : [
          styles.button,
          styles[variant] || styles.primary,
          fullWidth ? styles.fullWidth : '',
          className || '',
        ].join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...buttonProps}>
      {loading ? (
        <>
          <span className={styles.spinner} aria-hidden='true' />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default GeneralButton;
