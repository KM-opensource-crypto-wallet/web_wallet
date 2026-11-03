'use client';
import React, {createContext, useContext, useEffect, useState} from 'react';
import Link from 'next/link';
import {useSelector} from 'react-redux';
import {getIsVaultUnlocked} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {getContactUsEmail, getWhiteLabelId} from 'whitelabel/whiteLabelInfo';
import {getContactOptions, isAllowedHref} from './policy';
import styles from './SupportChat.module.css';

export const ERROR_KEYS = {
  invalid: 'errors.invalid',
  rate_limited: 'errors.rateLimited',
  captcha: 'errors.captcha',
  unavailable: 'errors.unavailable',
  busy: 'errors.busy',
  offline: 'errors.offline',
  timeout: 'errors.timeout',
};

export const LinkHostsContext = createContext([]);
// Called when an in-app link is followed, so the full-screen mobile panel closes.
export const NavigateContext = createContext(() => {});

export const SafeLink = ({href, children}) => {
  const linkHosts = useContext(LinkHostsContext);
  const onNavigate = useContext(NavigateContext);
  if (!isAllowedHref(href, linkHosts)) {
    return <span>{children}</span>;
  }
  if (href.startsWith('/')) {
    return (
      <Link href={href} onClick={onNavigate}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target='_blank' rel='noopener noreferrer'>
      {children}
    </a>
  );
};

export const Chips = ({title, chips, disabled, onPick, t}) =>
  chips.length === 0 ? null : (
    <div className={styles.chips}>
      <p className={styles.chipsTitle}>{t(title)}</p>
      {chips.map(chip => (
        <button
          key={chip.id}
          type='button'
          className={styles.chip}
          dir='auto'
          disabled={disabled}
          onClick={() => onPick(chip)}>
          {chip.title}
        </button>
      ))}
    </div>
  );

const SLOW_MS = 4000;

/** Thinking bubble: animated dots plus a status line that changes as the wait grows. */
export const LoadingStatus = ({t, veryLong}) => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(timer);
  }, []);
  let key = 'searching';
  if (veryLong) key = 'stillWorking';
  else if (slow) key = 'searchingMore';
  return (
    <div className={`${styles.bubble} ${styles.bot} ${styles.thinking}`}>
      <span className={styles.dots} aria-hidden='true'>
        <span />
        <span />
        <span />
      </span>
      <span role='status'>{t(key)}</span>
    </div>
  );
};

export const ContactOptions = ({t}) => {
  const unlocked = useSelector(getIsVaultUnlocked);
  const onNavigate = useContext(NavigateContext);
  const email = getContactUsEmail();
  const options = getContactOptions({
    email,
    whiteLabelId: getWhiteLabelId(),
    unlocked,
  });
  if (options.length === 0) return null;
  return (
    <div className={styles.contact}>
      <span>{t('contactTitle')}</span>
      <ul className={styles.contactList}>
        {options.map(option => (
          <li key={option.type}>
            {option.type === 'contactUs' ? (
              <Link href={option.href} onClick={onNavigate}>
                {t('contactUs')}
              </Link>
            ) : option.type === 'telegram' ? (
              <a href={option.href} target='_blank' rel='noopener noreferrer'>
                {t('contactTelegram')}
              </a>
            ) : (
              <>
                <span>{t('contactEmail')} </span>
                <a href={option.href}>{email}</a>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
