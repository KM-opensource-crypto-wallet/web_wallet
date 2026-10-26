import React, {useState} from 'react';
import {parseUri} from '@walletconnect/utils';
import {createWalletConnection} from 'dok-wallet-blockchain-networks/service/walletconnect';
import HomeSheet from 'components/Home/HomeSheet';
import GeneralButton from 'components/Button';
import {CloseIcon} from 'components/Home/HomeIcons';
import styles from './MadalWalletConnect.module.css';

const isValidWalletConnectUri = value => {
  if (!value?.startsWith('wc:')) {
    return false;
  }
  try {
    const {topic, version} = parseUri(value);
    return Boolean(topic && version);
  } catch (e) {
    return false;
  }
};

const STEPS = [
  'Open the dApp and choose WalletConnect.',
  'Copy its connection link (it starts with “wc:”).',
  'Paste it below and connect, then approve the request.',
];

// "New connection": pair with a dApp from its WalletConnect URI.
const MadalWalletConnect = ({visible, onClose}) => {
  const [connectValue, setConnectValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const setValue = value => {
    setConnectValue(value);
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleSubmit = async values => {
    const uri = values?.trim();
    if (!isValidWalletConnectUri(uri)) {
      setErrorMessage(
        'Invalid WalletConnect URI. Copy the connection link starting with "wc:" from the dApp — a wallet address will not work here.',
      );
      return;
    }
    setIsConnecting(true);
    try {
      await createWalletConnection({uri});
      setConnectValue('');
      onClose(false);
    } catch (e) {
      console.error('WalletConnect pairing failed:', e);
      setErrorMessage(
        e?.message?.includes('not initialised')
          ? 'WalletConnect is still starting. Try again in a moment.'
          : e?.message?.includes('Pairing already exists')
            ? 'This URI was already used. Get a fresh connection link from the dApp.'
            : 'Failed to connect. Get a fresh connection link from the dApp and try again.',
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const onPaste = async () => {
    try {
      const text = (await navigator.clipboard.readText())?.trim();
      if (text) {
        setValue(text);
      }
    } catch (e) {
      // Clipboard blocked: the field still accepts a manual paste.
    }
  };

  return (
    <HomeSheet
      visible={visible}
      onClose={() => onClose(false)}
      title='New connection'
      labelId='wallet-connect-title'>
      <form
        className={styles.form}
        noValidate
        onSubmit={event => {
          event.preventDefault();
          if (!isConnecting) {
            handleSubmit(connectValue);
          }
        }}>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step} className={styles.step}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className={styles.field}>
          <label htmlFor='wc-uri' className={styles.label}>
            Connection link
          </label>
          <div
            className={`${styles.inputBox} ${
              errorMessage ? styles.inputBoxError : ''
            }`}>
            <input
              id='wc-uri'
              className={styles.input}
              placeholder='wc:…'
              autoComplete='off'
              spellCheck={false}
              value={connectValue}
              onChange={event => setValue(event.target.value)}
              aria-invalid={!!errorMessage}
            />
            {connectValue ? (
              <button
                type='button'
                className={styles.clear}
                aria-label='Clear'
                onClick={() => setValue('')}>
                <CloseIcon size={12} />
              </button>
            ) : (
              <button type='button' className={styles.paste} onClick={onPaste}>
                Paste
              </button>
            )}
          </div>
          {errorMessage ? (
            <p className={styles.error} role='alert'>
              {errorMessage}
            </p>
          ) : null}
        </div>

        <GeneralButton
          type='submit'
          fullWidth
          className={styles.submit}
          disabled={!connectValue.trim()}
          loading={isConnecting}
          loadingLabel='Connecting…'>
          Connect
        </GeneralButton>
      </form>
    </HomeSheet>
  );
};

export default MadalWalletConnect;
