import React, {useState} from 'react';
import styles from './AuthLayout.module.css';

// Building blocks shared by the auth screens (login, registration), so they
// keep one look: warm background with an accent glow, a left-aligned heading,
// then the form (a glass `card` of fields and a `footer` with the action).
// See AuthLayout.module.css for the layout.

export const authStyles = styles;

// `topBar` (optional) sits above the heading, e.g. a back button.
// `wide` widens the column for content that needs room, e.g. legal documents.
const AuthLayout = ({title, subtitle, topBar, wide, children}) => (
  <div className={styles.page}>
    <div className={styles.glow} aria-hidden='true' />
    <div className={`${styles.column} ${wide ? styles.columnWide : ''}`}>
      {topBar}
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {children}
    </div>
  </div>
);

// `valid` paints the field green; `adornment` sits before the eye button.
export const PasswordInput = ({
  id,
  placeholder,
  invalid,
  valid,
  adornment,
  className,
  describedBy,
  ...inputProps
}) => {
  const [hidden, setHidden] = useState(true);
  const state = invalid ? styles.fieldError : valid ? styles.fieldValid : '';
  return (
    <div className={`${styles.field} ${state} ${className || ''}`}>
      <input
        id={id}
        name={id}
        type={hidden ? 'password' : 'text'}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={styles.input}
        {...inputProps}
      />
      {adornment}
      <button
        type='button'
        className={styles.eye}
        aria-label={hidden ? 'Show password' : 'Hide password'}
        aria-pressed={!hidden}
        onClick={() => setHidden(!hidden)}>
        <svg
          width='22'
          height='22'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.8'
          strokeLinecap='round'>
          <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z' />
          <circle cx='12' cy='12' r='3' />
          {hidden ? <line x1='4' y1='20' x2='20' y2='4' /> : null}
        </svg>
      </button>
    </div>
  );
};

export const SubmitButton = ({busy, busyLabel, disabled, children}) => (
  <button
    className={`${styles.button} ${disabled && !busy ? styles.buttonOff : ''}`}
    type='submit'
    disabled={busy || disabled}>
    {busy ? (
      <>
        <span className={styles.spinner} aria-hidden='true' />
        {busyLabel}
      </>
    ) : (
      children
    )}
  </button>
);

export const NonCustodialNote = () => (
  <p className={styles.note}>
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      aria-hidden='true'>
      <rect x='4' y='10' width='16' height='10' rx='2' />
      <path d='M8 10V7a4 4 0 0 1 8 0v3' />
    </svg>
    Non-custodial · your keys never leave this device
  </p>
);

export const InfoNote = ({children}) => (
  <p className={styles.info}>
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      aria-hidden='true'>
      <circle cx='12' cy='12' r='9' />
      <path d='M12 8h.01' />
      <path d='M12 11v5' />
    </svg>
    {children}
  </p>
);

// Back arrow with the step's name, for AuthLayout's `topBar`.
export const BackBar = ({title, onBack}) => (
  <div className={styles.topBar}>
    <button
      type='button'
      className={styles.back}
      aria-label='Back'
      onClick={onBack}>
      <svg
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'>
        <path d='M15 18l-6-6 6-6' />
      </svg>
    </button>
    <span className={styles.topTitle}>{title}</span>
  </div>
);

export default AuthLayout;
