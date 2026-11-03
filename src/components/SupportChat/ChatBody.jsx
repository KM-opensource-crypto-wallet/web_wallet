'use client';
import React, {useEffect, useRef} from 'react';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import {getAppTitle} from 'whitelabel/whiteLabelInfo';
import BotMessage from './BotMessage';
import {Chips, ContactOptions, ERROR_KEYS, LoadingStatus} from './ChatParts';
import styles from './SupportChat.module.css';

const MAX_INPUT = 1000;

const ChatBody = ({
  state,
  input,
  onInput,
  onSubmit,
  onPick,
  onReset,
  onClose,
  titleId,
  autoFocus,
  t,
}) => {
  const logRef = useRef(null);
  const busy = state.pending !== null;
  const messageCount = state.messages.length;

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount, busy]);

  return (
    <>
      <div className={styles.header}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.avatar}
          src='/images/support-chat-launcher.png'
          alt=''
        />
        <h2 id={titleId} className={styles.title}>
          {t('title')}
        </h2>
        <button
          type='button'
          className={styles.newConversation}
          onClick={onReset}>
          {t('newConversation')}
        </button>
        <IconButton aria-label={t('close')} onClick={onClose} size='small'>
          <CloseIcon fontSize='small' />
        </IconButton>
      </div>
      <p className={styles.notice}>{t('notice')}</p>
      <div
        ref={logRef}
        className={styles.log}
        role='log'
        aria-live='polite'
        aria-relevant='additions'>
        <div className={`${styles.bubble} ${styles.bot}`} dir='auto'>
          {t('greeting', {appName: getAppTitle()})}
        </div>
        {state.starters === null && state.startersLoading ? (
          <span className={styles.typing} role='status'>
            <CircularProgress size={14} aria-hidden='true' />
            <span className={styles.srOnly}>{t('typing')}</span>
          </span>
        ) : null}
        {state.startersError ? (
          <div
            className={`${styles.bubble} ${styles.bot} ${styles.error}`}
            dir='auto'>
            <p>
              {t(ERROR_KEYS[state.startersError] || ERROR_KEYS.unavailable)}
            </p>
            <ContactOptions t={t} />
          </div>
        ) : null}
        {state.starters ? (
          <Chips
            title='startersTitle'
            chips={state.starters}
            disabled={busy}
            onPick={onPick}
            t={t}
          />
        ) : null}
        {state.messages.map(message =>
          message.role === 'user' ? (
            <div
              key={message.id}
              className={`${styles.bubble} ${styles.user} ${
                message.redacted ? styles.redacted : ''
              }`}
              dir='auto'>
              {message.redacted ? t('redacted') : message.text}
            </div>
          ) : (
            <BotMessage
              key={message.id}
              message={message}
              disabled={busy}
              onPick={onPick}
              t={t}
            />
          ),
        )}
        {busy ? <LoadingStatus t={t} veryLong={state.stillWorking} /> : null}
      </div>
      <form className={styles.form} onSubmit={onSubmit}>
        <input
          className={styles.input}
          dir='auto'
          type='text'
          value={input}
          maxLength={MAX_INPUT}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          autoComplete='off'
          autoFocus={autoFocus}
          onChange={e => onInput(e.target.value)}
        />
        <IconButton
          type='submit'
          aria-label={t('send')}
          disabled={busy || input.trim() === ''}
          color='primary'>
          <SendIcon />
        </IconButton>
      </form>
    </>
  );
};

export default ChatBody;
