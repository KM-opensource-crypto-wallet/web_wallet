'use client';
import React from 'react';
import useLearnReset from 'src/hooks/auth/resetWallet/useLearnReset';
import AuthLayout, {BackBar, authStyles} from 'components/AuthLayout';
import styles from './LearnReset.module.css';

const Icon = ({children}) => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'>
    {children}
  </svg>
);

const LearnReset = () => {
  const {goBack, learnMoreUrl} = useLearnReset();

  return (
    <AuthLayout
      topBar={<BackBar title='Learn' onBack={goBack} />}
      title='What is a seed phrase?'
      subtitle='A list of words that stores everything needed to recover your digital assets.'>
      <div className={authStyles.form}>
        <div className={`${authStyles.card} ${styles.card}`}>
          <ul className={styles.points}>
            <li>
              <span className={styles.tile}>
                <Icon>
                  <path d='M12 20h9' />
                  <path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' />
                </Icon>
              </span>
              <p>
                <strong>Written down, kept offline.</strong> Wallet software
                typically generates a seed phrase and asks you to write it down
                on paper.
              </p>
            </li>
            <li>
              <span className={styles.tile}>
                <Icon>
                  <path d='M3 12a9 9 0 1 0 3-6.7L3 8' />
                  <path d='M3 3v5h5' />
                </Icon>
              </span>
              <p>
                <strong>Your way back in.</strong> If your computer breaks or
                its drive is corrupted, install the same wallet again and use
                the paper backup to get your assets back.
              </p>
            </li>
          </ul>
        </div>

        <div className={styles.warning} role='note'>
          <span className={`${styles.tile} ${styles.danger}`}>
            <Icon>
              <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' />
              <path d='M12 9v4' />
              <path d='M12 17h.01' />
            </Icon>
          </span>
          <p>
            <strong>Anyone who finds the phrase can steal the coins.</strong>{' '}
            Keep it as safe as jewels or cash.
          </p>
        </div>

        <div className={authStyles.footer}>
          <a
            href={learnMoreUrl}
            target='_blank'
            rel='noopener noreferrer'
            className={`${authStyles.button} ${styles.linkButton}`}>
            Read more on the Bitcoin Wiki
          </a>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LearnReset;
