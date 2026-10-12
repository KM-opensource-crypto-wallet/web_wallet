import React, {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import {PrivateKeyList} from 'dok-wallet-blockchain-networks/helper';
import useImportWallet, {
  WORD_SET,
} from 'src/hooks/auth/importWallet/useImportWallet';
import {chainLogoMap} from 'assets/chain_logo';
import AuthLayout, {
  BackBar,
  PasswordInput,
  authStyles,
} from 'components/AuthLayout';
import GeneralButton from 'src/components/Button';
import s from './ImportWallet.module.css';

const LockIcon = () => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    aria-hidden='true'>
    <rect x='4' y='10' width='16' height='10' rx='2' />
    <path d='M8 10V7a4 4 0 0 1 8 0v3' />
  </svg>
);

const ChainBadge = ({value, label, size}) => {
  const logo = chainLogoMap[value];
  return (
    <span className={s.chainBadge} style={{width: size, height: size}}>
      {logo ? (
        <Image src={logo} alt='' width={size} height={size} />
      ) : (
        label?.[0]
      )}
    </span>
  );
};

// Network picker with search, for private key imports.
const NetworkPicker = ({value, onChange}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const selected = PrivateKeyList.find(item => item.value === value);
  const q = query.trim().toLowerCase();
  const items = q
    ? PrivateKeyList.filter(item => item.label.toLowerCase().includes(q))
    : PrivateKeyList;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = e => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = e => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={s.picker} ref={rootRef}>
      <GeneralButton
        variant='unstyled'
        id='import-network'
        className={s.pickerButton}
        aria-haspopup='listbox'
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setQuery('');
        }}>
        {selected ? (
          <ChainBadge value={selected.value} label={selected.label} size={26} />
        ) : null}
        <span className={selected ? s.pickerValue : s.pickerPlaceholder}>
          {selected ? selected.label : 'Select network'}
        </span>
        <svg
          className={`${s.pickerChevron} ${open ? s.pickerChevronOpen : ''}`}
          width='18'
          height='18'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'>
          <path d='M6 9l6 6 6-6' />
        </svg>
      </GeneralButton>
      {open ? (
        <div className={s.menu}>
          <div className={s.menuSearch}>
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              aria-hidden='true'>
              <circle cx='11' cy='11' r='7' />
              <path d='M21 21l-4.3-4.3' />
            </svg>
            <input
              autoFocus={true}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='Search network'
              aria-label='Search network'
            />
          </div>
          <ul className={s.menuList} role='listbox' aria-label='Networks'>
            {items.map(item => (
              <li key={item.value}>
                <GeneralButton
                  variant='unstyled'
                  role='option'
                  aria-selected={item.value === value}
                  className={`${s.menuItem} ${
                    item.value === value ? s.menuItemSelected : ''
                  }`}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}>
                  <ChainBadge value={item.value} label={item.label} size={24} />
                  <span className={s.menuLabel}>{item.label}</span>
                  {item.value === value ? (
                    <svg
                      width='17'
                      height='17'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      aria-hidden='true'>
                      <path d='M20 6 9 17l-5-5' />
                    </svg>
                  ) : null}
                </GeneralButton>
              </li>
            ))}
            {items.length === 0 ? (
              <li className={s.menuEmpty}>No networks found</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

// Back bar plus the Seed phrase / Private key tabs. Takes its values as
// arguments because it lives outside ImportWallet.
const renderTabBar = ({goBack, isSeed, selectSeedMode, selectKeyMode}) => {
  return (
    <>
      <BackBar title='Import wallet' onBack={goBack} />
      <div className={s.tabs} role='tablist' aria-label='Import with'>
        <GeneralButton
          variant='unstyled'
          role='tab'
          aria-selected={isSeed}
          className={`${s.tab} ${isSeed ? s.tabActive : ''}`}
          onClick={selectSeedMode}>
          Seed phrase
        </GeneralButton>
        <GeneralButton
          variant='unstyled'
          role='tab'
          aria-selected={!isSeed}
          className={`${s.tab} ${!isSeed ? s.tabActive : ''}`}
          onClick={selectKeyMode}>
          Private key
        </GeneralButton>
      </div>
    </>
  );
};

// Import with a seed phrase or a private key (`initialMode`: 'seed' | 'key').
// Either way the secret goes to the store and the name step follows.
const ImportWallet = ({initialMode = 'seed'}) => {
  const {
    isSeed,
    selectSeedMode,
    selectKeyMode,
    goBack,
    seed,
    seedRef,
    seedError,
    onSeedChange,
    words,
    isTyping,
    suggestions,
    pickSuggestion,
    onPaste,
    countLabel,
    countStatus,
    seedBoxStatus,
    network,
    onNetworkChange,
    privateKey,
    onPrivateKeyChange,
    keyError,
    isSubmitting,
    canImport,
    onSubmit,
  } = useImportWallet({initialMode});
  const subTitle = isSeed
    ? 'Usually 12 or 24 words, separated by spaces, in the correct order.'
    : 'Import a single address from its exported private key.';
  const title = isSeed ? 'Enter your seed phrase' : 'Enter your private key';
  const countClass =
    countStatus === 'ok' ? s.countOk : countStatus === 'bad' ? s.countBad : '';
  const seedBoxClass =
    seedBoxStatus === 'ok'
      ? s.seedBoxOk
      : seedBoxStatus === 'bad'
        ? s.seedBoxBad
        : '';

  return (
    <AuthLayout
      topBar={renderTabBar({goBack, isSeed, selectSeedMode, selectKeyMode})}
      title={title}
      subtitle={subTitle}>
      <form className={authStyles.form} onSubmit={onSubmit} noValidate>
        {isSeed ? (
          <div>
            <div className={`${s.seedBox} ${seedBoxClass}`}>
              <textarea
                ref={seedRef}
                className={s.seedInput}
                value={seed}
                onChange={onSeedChange}
                placeholder='word1 word2 word3 …'
                rows={4}
                autoFocus={true}
                autoComplete='off'
                autoCapitalize='none'
                spellCheck={false}
                aria-label='Seed phrase'
                aria-invalid={!!seedError || undefined}
                aria-describedby='seed-count seed-error'
              />
              <div className={s.seedFooter}>
                <span
                  id='seed-count'
                  className={`${s.count} ${countClass}`}
                  aria-live='polite'>
                  {countLabel}
                </span>
                <GeneralButton
                  variant='unstyled'
                  className={s.paste}
                  onClick={onPaste}>
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    aria-hidden='true'>
                    <rect x='8' y='2' width='8' height='4' rx='1' />
                    <path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' />
                  </svg>
                  Paste
                </GeneralButton>
              </div>
            </div>

            {suggestions.length ? (
              <div className={s.suggestions} aria-label='Word suggestions'>
                {suggestions.map(word => (
                  <GeneralButton
                    key={word}
                    variant='unstyled'
                    className={s.suggestion}
                    onClick={() => pickSuggestion(word)}>
                    {word}
                  </GeneralButton>
                ))}
              </div>
            ) : null}

            {words.length ? (
              <ol className={s.words} aria-label='Words entered'>
                {words.map((word, index) => {
                  const known = WORD_SET.has(word);
                  // The word still being typed stays neutral until it is a
                  // real word or the user moves on.
                  const typing =
                    isTyping && index === words.length - 1 && !known;
                  return (
                    <li
                      key={`${index}-${word}`}
                      className={`${s.word} ${
                        typing ? '' : known ? s.wordOk : s.wordBad
                      }`}>
                      <span className={s.wordIndex}>{index + 1}</span>
                      {word}
                    </li>
                  );
                })}
              </ol>
            ) : null}

            {seedError ? (
              <p id='seed-error' className={authStyles.error} role='alert'>
                {seedError}
              </p>
            ) : null}
          </div>
        ) : (
          <div>
            <label htmlFor='import-network' className={authStyles.label}>
              Network
            </label>
            <NetworkPicker value={network} onChange={onNetworkChange} />

            <label
              htmlFor='private-key'
              className={`${authStyles.label} ${s.keyLabel}`}>
              Private key
            </label>
            <PasswordInput
              id='private-key'
              placeholder='Enter private key'
              aria-label='Private key'
              className={s.keyField}
              autoComplete='off'
              spellCheck={false}
              invalid={!!keyError}
              describedBy={keyError ? 'key-error' : undefined}
              value={privateKey}
              onChange={onPrivateKeyChange}
            />
            {keyError ? (
              <p id='key-error' className={authStyles.error} role='alert'>
                {keyError}
              </p>
            ) : null}
          </div>
        )}

        <p className={authStyles.info}>
          <LockIcon />
          {isSeed
            ? 'Your seed phrase is encrypted and stored only on this device.'
            : 'Your private key is encrypted and stored only on this device.'}
        </p>

        <div className={authStyles.footer}>
          <GeneralButton
            type='submit'
            fullWidth
            loading={isSubmitting}
            loadingLabel='Importing…'
            disabled={!canImport}>
            Import wallet
          </GeneralButton>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ImportWallet;
