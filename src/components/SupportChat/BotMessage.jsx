'use client';
import React from 'react';
import Markdown from 'react-markdown';
import {MARKDOWN_PROPS} from './policy';
import {Chips, ContactOptions, ERROR_KEYS, SafeLink} from './ChatParts';
import styles from './SupportChat.module.css';

const MARKDOWN_COMPONENTS = {a: SafeLink};

// Related questions belong to the latest answer only, and skip what was asked.
const BotMessage = ({message, latest, asked, disabled, onPick, t}) => {
  if (message.kind === 'answer') {
    const related = latest
      ? message.related.filter(chip => !asked.has(chip.title))
      : [];
    return (
      <>
        <div
          className={`${styles.bubble} ${styles.bot}`}
          data-answer='true'
          dir='auto'>
          <Markdown components={MARKDOWN_COMPONENTS} {...MARKDOWN_PROPS}>
            {message.text}
          </Markdown>
        </div>
        <Chips
          title='related'
          chips={related}
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
