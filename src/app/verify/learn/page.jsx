'use client';

import styles from './Learn.module.css';
import {useRouter} from 'next/navigation';
import React, {useContext, useState} from 'react';
import {KeyIcon} from 'components/Home/HomeIcons';

// Seed phrase explainer, opened in a new tab from VerifyInfo's "Learn more".
// A standalone read: no back affordance, the quote leads into a glass card.
const Learn = () => {
  return (
    <main className={styles.container}>
      <div className={styles.glow} aria-hidden='true' />
      <div className={styles.infoList}>
        <span className={styles.icon} aria-hidden='true'>
          <KeyIcon size={24} />
        </span>
        <p className={styles.titleInfo}>
          &quot;With great power comes great responsibility&quot;
        </p>
        <p className={styles.info}>
          A &nbsp;
          <span className={styles.span}>seed phrase </span> ensures that no one
          can access your funds except you. It`s like having the keys to a bank
          vault - you need to keep that phrase 100% SECURE so that you, and only
          you, can access it. But what if you lose or forget the phrase? Well,
          unfortunately, if you lose access to your &nbsp;
          <span className={styles.span}>seed phrase </span> then you lose access
          to all your crypto assets. So keeping your&nbsp;
          <span className={styles.span}>seed phrase </span> safe is super
          important, especially in the case your computer, smartphone, hardware
          wallet, etc.breaks or gets lost. This phrase will be what stands
          between you and keeping control of your assets.
        </p>
      </div>
    </main>
  );
};

export default Learn;
