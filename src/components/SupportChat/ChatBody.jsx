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

  // A new answer scrolls to its first line, so long answers are read from the
  // top; everything else (your message, the loading bubble) scrolls to the end.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const last = state.messages[messageCount - 1];
    const answers = el.querySelectorAll('[data-answer]');
    if (
      !busy &&
      last?.role === 'bot' &&
      last.kind === 'answer' &&
      answers.length
    ) {
      const top =
        answers[answers.length - 1].getBoundingClientRect().top -
        el.getBoundingClientRect().top +
        el.scrollTop;
      el.scrollTop = Math.max(0, top - 8);
    } else {
      el.scrollTop = el.scrollHeight;
    }
    // Only a new message or a change of the busy flag moves the scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageCount, busy]);
  const asked = new Set(
    state.messages.filter(m => m.role === 'user').map(m => m.text),
  );

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
        <IconButton
          aria-label={t('close')}
          onClick={onClose}
          size='small'
          sx={{color: 'var(--font)'}}>
          <CloseIcon fontSize='small' />
        </IconButton>
      </div>
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
        {/* Once the conversation starts, the answer is the focus: no starters. */}
        {state.starters && state.messages.length === 0 ? (
          <Chips
            title='startersTitle'
            chips={state.starters}
            disabled={busy}
            onPick={onPick}
            t={t}
          />
        ) : null}
        {state.messages.map((message, index) =>
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
              latest={index === messageCount - 1}
              asked={asked}
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
          sx={{
            color: 'var(--background)',
            '&.Mui-disabled': {
              color: 'color-mix(in srgb, var(--font) 35%, transparent)',
            },
          }}>
          <SendIcon />
        </IconButton>
      </form>
      <p className={styles.notice}>{t('notice')}</p>
    </>
  );
};

export default ChatBody;
