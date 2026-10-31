import * as React from 'react';
import {useSelector} from 'react-redux';
import {getDisableMessage} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProvidersSelectors';
import styles from './DisabledView.module.css';
import {useEffect, useState} from 'react';
import {
  getSupportTelegramUrl,
  openSupportEmail,
  openSupportTelegram,
} from 'utils/contactSupport';
import {getSupportId} from 'services/logger';

const DisabledView = () => {
  const message = useSelector(getDisableMessage);

  // Browser-only (Sentry user), so it is read after mount to keep the server
  // and client markup identical.
  const [supportId, setSupportId] = useState('');
  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => setSupportId(getSupportId()))();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.subContainer}>
        <p className={styles.messageText}>{message}</p>
      </div>
      <div className={styles.bottomView}>
        <p className={styles.contactText}>
          For more information. Please contact us on via{' '}
          <button
            className={styles.buttonContactText}
            onClick={openSupportEmail}
            onKeyUp={openSupportEmail}
            tabIndex={0}>
            {'Email'}
          </button>{' '}
          {!!getSupportTelegramUrl() && (
            <>
              <span className={styles.contactText}>or </span>
              <button
                className={styles.buttonContactText}
                onClick={openSupportTelegram}
                onKeyUp={openSupportTelegram}
                tabIndex={1}>
                {'Telegram'}
              </button>
            </>
          )}{' '}
          for additional support.
        </p>
        {!!supportId && (
          <p className={styles.supportIdText}>{`Support ID: ${supportId}`}</p>
        )}
      </div>
    </div>
  );
};

export default DisabledView;
