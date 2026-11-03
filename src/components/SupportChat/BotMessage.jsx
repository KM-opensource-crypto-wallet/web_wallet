'use client';
import React from 'react';
import Markdown from 'react-markdown';
import {MARKDOWN_PROPS} from './policy';
import {Chips, ContactOptions, ERROR_KEYS, SafeLink} from './ChatParts';
import styles from './SupportChat.module.css';

const MARKDOWN_COMPONENTS = {a: SafeLink};

const BotMessage = ({message, disabled, onPick, t}) => {
  if (message.kind === 'answer') {
    return (
      <>
        <div className={`${styles.bubble} ${styles.bot}`} dir='auto'>
          <Markdown components={MARKDOWN_COMPONENTS} {...MARKDOWN_PROPS}>
            {message.text}
          </Markdown>
        </div>
        <Chips
          title='related'
          chips={message.related}
          disabled={disabled}
          onPick={onPick}
          t={t}
        />
      </>
    );
  }
  let text;
  let safety = false;
  if (message.kind === 'notCovered') {
    text = t('notCovered');
    safety = true;
  } else if (message.kind === 'secretBlocked') {
    text = t('secretBlocked');
  } else {
    text = t(ERROR_KEYS[message.code] || ERROR_KEYS.unavailable);
  }
  return (
    <div
      className={`${styles.bubble} ${styles.bot} ${
        safety || message.kind === 'secretBlocked' ? '' : styles.error
      }`}
      dir='auto'>
      <p>{text}</p>
      {safety ? <p className={styles.muted}>{t('safetyLine')}</p> : null}
      <ContactOptions t={t} />
    </div>
  );
};

export default BotMessage;
