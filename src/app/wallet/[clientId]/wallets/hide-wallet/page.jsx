'use client';

import React, {useMemo, useState, useCallback, useEffect, useRef} from 'react';
import {useSelector, useDispatch, shallowEqual} from 'react-redux';
import {useParams, useRouter} from 'next/navigation';
import ModalHideWalletConfirm from 'components/ModalHideWalletConfirm';
import GeneralButton from 'components/Button';
import {
  ChevronLeftIcon,
  EyeIcon,
  InfoIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import {
  selectAllWalletName,
  selectAllWallets,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  clearWalletHideSettings,
  isSecretCodeInUseByOtherWallet,
  RELOCK_OPTIONS,
  setWalletHideSettings,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {store} from 'redux/store';
import {
  generateSecretCodeSalt,
  hashSecretCode,
  isSecretCodeFormatValid,
  secretCodeMatchesWalletName,
  SECRET_CODE_ITERATIONS,
  SECRET_CODE_MAX_LENGTH,
  SECRET_CODE_MIN_LENGTH,
} from 'utils/hideWallet';
import s from './HideWallet.module.css';

const RELOCK_OPTIONS_UI = [
  {
    label: 'On page refresh (default)',
    hint: 'Hidden again whenever the app reloads',
    value: RELOCK_OPTIONS.RELAUNCH,
  },
  {
    label: 'Manual only',
    hint: 'Stays visible until you hide it again',
    value: RELOCK_OPTIONS.MANUAL,
  },
];

const HideWallet = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  // Wallet being hidden - always the wallet named in the URL (may not be the
  // currently active wallet, e.g. hiding another wallet from its Edit screen)
  const {clientId: walletClientId} = useParams();
  const allWallets = useSelector(selectAllWallets);
  const allWalletName = useSelector(selectAllWalletName, shallowEqual);
  const editingWallet = allWallets.find(
    item => item?.clientId === walletClientId,
  );
  const initialHideSettings = editingWallet?.hideSettings || null;
  const otherWalletNames = useMemo(
    () => allWalletName.filter(name => name !== editingWallet?.walletName),
    [allWalletName, editingWallet?.walletName],
  );

  const [isHideEnabled, setIsHideEnabled] = useState(!!initialHideSettings);
  const [secretCode, setSecretCode] = useState('');
  const [secretCodeError, setSecretCodeError] = useState(null);
  const [hideToggleError, setHideToggleError] = useState(null);
  const [relockOption, setRelockOption] = useState(
    initialHideSettings?.relockOption || RELOCK_OPTIONS.RELAUNCH,
  );
  // null | 'info' | 'confirm' - a single source of truth so the info and
  // confirm modals can never both be considered visible at once.
  const [hideModal, setHideModal] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // AC6: at least one wallet must stay PUBLIC (no hideSettings at all). A
  // merely *revealed* hidden wallet doesn't count - it re-locks on relaunch/
  // background, which would leave zero visible wallets. Disable the toggle
  // outright instead of letting the user tap it and then blocking.
  const hasOtherPublicWallet = allWallets.some(
    item =>
      item?.clientId !== walletClientId &&
      !!item?.walletName &&
      !item?.hideSettings,
  );
  const isHideToggleDisabled = !isHideEnabled && !hasOtherPublicWallet;
  const isSecretCodeRequired = isHideEnabled && !initialHideSettings;
  const isHideSectionInvalid =
    isHideEnabled &&
    ((!secretCode && isSecretCodeRequired) ||
      (!!secretCode && !isSecretCodeFormatValid(secretCode)) ||
      !!secretCodeError);
  // Web has no app-background event, so a wallet stored as BACKGROUND (e.g.
  // synced from mobile) behaves exactly like RELAUNCH here. Map it to RELAUNCH
  // for display only - the stored value is left untouched unless the user picks
  // a different radio.
  const displayRelockOption =
    relockOption === RELOCK_OPTIONS.BACKGROUND
      ? RELOCK_OPTIONS.RELAUNCH
      : relockOption;

  // Debounced since PBKDF2 is deliberately slow - runs against every other
  // hidden wallet's stored salt/hash (AC2's "code already in use" rule).
  const duplicateCheckTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(duplicateCheckTimeoutRef.current);
    };
  }, []);

  const checkDuplicateSecretCode = useCallback(
    code => {
      duplicateCheckTimeoutRef.current = setTimeout(async () => {
        const inUse = await isSecretCodeInUseByOtherWallet(
          store.getState(),
          code,
          walletClientId,
        );
        setSecretCodeError(
          inUse ? 'This code is already used by another hidden wallet' : null,
        );
      }, 300);
    },
    [walletClientId],
  );

  const handleSecretCodeChange = text => {
    clearTimeout(duplicateCheckTimeoutRef.current);
    setSecretCode(text);
    if (!text) {
      setSecretCodeError(null);
      return;
    }
    if (!isSecretCodeFormatValid(text)) {
      setSecretCodeError(
        `Must be ${SECRET_CODE_MIN_LENGTH}-${SECRET_CODE_MAX_LENGTH} characters: letters, numbers, @, _ or - only`,
      );
      return;
    }
    if (secretCodeMatchesWalletName(text, otherWalletNames)) {
      setSecretCodeError('Secret code must not be another wallet name');
      return;
    }
    setSecretCodeError(null);
    checkDuplicateSecretCode(text);
  };

  const handleToggleHide = value => {
    // The switch is already `disabled` in this case (see isHideToggleDisabled)
    // - this is just a defensive fallback against it firing anyway.
    if (value && !hasOtherPublicWallet) {
      setHideToggleError(
        'At least one wallet must stay public. Unhide another wallet or add a new one before hiding this one.',
      );
      return;
    }
    setHideToggleError(null);
    setIsHideEnabled(value);
    if (!value) {
      setSecretCode('');
      setSecretCodeError(null);
    }
  };

  const handleRelockChange = label => {
    const found = RELOCK_OPTIONS_UI.find(option => option.label === label);
    if (found) {
      setRelockOption(found.value);
    }
  };

  const doHideSave = useCallback(async () => {
    if (isHideEnabled) {
      if (secretCode) {
        const salt = generateSecretCodeSalt();
        const hash = await hashSecretCode(secretCode, salt);
        dispatch(
          setWalletHideSettings({
            clientId: walletClientId,
            secretCodeSalt: salt,
            secretCodeHash: hash,
            secretCodeIterations: SECRET_CODE_ITERATIONS,
            relockOption,
          }),
        );
      } else if (
        initialHideSettings?.secretCodeSalt &&
        initialHideSettings?.secretCodeHash
      ) {
        // Blank code while already hidden = keep the existing code, only the
        // re-lock option may have changed. (Salt/hash are absent from memory
        // while the session is locked; the reducer would throw on them.)
        dispatch(
          setWalletHideSettings({
            clientId: walletClientId,
            secretCodeSalt: initialHideSettings.secretCodeSalt,
            secretCodeHash: initialHideSettings.secretCodeHash,
            secretCodeIterations: initialHideSettings.secretCodeIterations,
            relockOption,
          }),
        );
      }
    } else if (initialHideSettings) {
      dispatch(clearWalletHideSettings({clientId: walletClientId}));
    }
    if (isHideEnabled) {
      // The wallet is now hidden (setWalletHideSettings always re-locks it),
      // so the screens beneath - the wallet list, or Home if this was the
      // current wallet - may still be showing it. Land on Home instead of
      // going back.
      router.replace('/home');
    } else {
      router.back();
    }
  }, [
    isHideEnabled,
    secretCode,
    relockOption,
    initialHideSettings,
    walletClientId,
    dispatch,
    router,
  ]);

  const performHideSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await doHideSave();
    } finally {
      setIsSaving(false);
    }
  }, [doHideSave]);

  const handleSubmit = useCallback(async () => {
    if (isHideEnabled) {
      if (secretCode) {
        if (secretCodeMatchesWalletName(secretCode, otherWalletNames)) {
          setSecretCodeError('Secret code must not be another wallet name');
          return;
        }
        setIsSaving(true);
        let codeInUse;
        try {
          codeInUse = await isSecretCodeInUseByOtherWallet(
            store.getState(),
            secretCode,
            walletClientId,
          );
        } finally {
          setIsSaving(false);
        }
        if (codeInUse) {
          setSecretCodeError(
            'This code is already used by another hidden wallet',
          );
          return;
        }
      }
      setHideModal('confirm');
      return;
    }
    performHideSave();
  }, [
    isHideEnabled,
    secretCode,
    otherWalletNames,
    walletClientId,
    performHideSave,
  ]);

  const onConfirmHideAndSave = useCallback(() => {
    setHideModal(null);
    performHideSave();
  }, [performHideSave]);

  const onCancelHideModal = useCallback(() => {
    setHideModal(null);
  }, []);

  const toggleError =
    hideToggleError ||
    (isHideToggleDisabled
      ? 'At least one wallet must stay public. Unhide another wallet or add a new one before hiding this one.'
      : null);

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <div className={s.heading}>
          <h1 className={s.headingTitle}>Hide wallet</h1>
          {editingWallet?.walletName ? (
            <span className={s.headingSub}>{editingWallet.walletName}</span>
          ) : null}
        </div>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='How hiding works'
          onClick={() => setHideModal('info')}>
          <InfoIcon size={20} />
        </GeneralButton>
      </div>

      <form
        className={s.column}
        noValidate
        onSubmit={event => {
          event.preventDefault();
          if (!isHideSectionInvalid && !isSaving) {
            handleSubmit();
          }
        }}>
        <section className={s.card} aria-label='Hide wallet'>
          <div className={s.toggleRow}>
            <span className={s.toggleIcon}>
              <EyeIcon size={19} off />
            </span>
            <span className={s.toggleText}>
              <span className={s.toggleTitle}>Hide this wallet</span>
              <span className={s.toggleHint}>
                Keep it out of the wallet list until its secret code is
                searched.
              </span>
            </span>
            <button
              type='button'
              role='switch'
              aria-checked={isHideEnabled}
              aria-label='Hide this wallet'
              className={`${s.switch} ${isHideEnabled ? s.switchOn : ''}`}
              disabled={isHideToggleDisabled}
              onClick={() => handleToggleHide(!isHideEnabled)}>
              <span className={s.knob} />
            </button>
          </div>
        </section>

        {toggleError ? (
          <p className={s.alert} role='alert'>
            {toggleError}
          </p>
        ) : null}

        {isHideEnabled ? (
          <>
            <section className={s.field}>
              <label htmlFor='secret-code' className={s.label}>
                Secret code
                {initialHideSettings ? (
                  <span className={s.optional}> · optional</span>
                ) : null}
              </label>
              <div
                className={`${s.inputBox} ${
                  secretCodeError ? s.inputBoxError : ''
                }`}>
                <input
                  id='secret-code'
                  className={s.input}
                  type={showCode ? 'text' : 'password'}
                  autoComplete='off'
                  autoCapitalize='none'
                  spellCheck={false}
                  value={secretCode}
                  onChange={e => handleSecretCodeChange(e.target.value)}
                  placeholder={
                    initialHideSettings
                      ? 'Leave blank to keep the current code'
                      : 'Choose a secret code'
                  }
                  aria-invalid={!!secretCodeError}
                />
                <button
                  type='button'
                  className={s.reveal}
                  aria-label={showCode ? 'Hide code' : 'Show code'}
                  onClick={() => setShowCode(v => !v)}>
                  <EyeIcon size={18} off={showCode} />
                </button>
              </div>
              {secretCodeError ? (
                <p className={s.error} role='alert'>
                  {secretCodeError}
                </p>
              ) : (
                <p className={s.hint}>
                  {SECRET_CODE_MIN_LENGTH}-{SECRET_CODE_MAX_LENGTH} characters:
                  letters, numbers, @, _ or -. It can&apos;t be another
                  wallet&apos;s name.
                </p>
              )}
            </section>

            <section className={s.field}>
              <span className={s.label}>Re-hide this wallet</span>
              <div
                className={s.options}
                role='radiogroup'
                aria-label='Re-hide this wallet'>
                {RELOCK_OPTIONS_UI.map(option => {
                  const on = option.value === displayRelockOption;
                  return (
                    <button
                      key={option.value}
                      type='button'
                      role='radio'
                      aria-checked={on}
                      className={`${s.option} ${on ? s.optionOn : ''}`}
                      onClick={() => handleRelockChange(option.label)}>
                      <span className={s.radio}>
                        {on ? <span className={s.radioDot} /> : null}
                      </span>
                      <span className={s.optionText}>
                        <span className={s.optionTitle}>{option.label}</span>
                        <span className={s.optionHint}>{option.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <p className={s.note}>
              <SearchIcon size={16} />
              <span>
                To open a hidden wallet, type its secret code into the search on
                the Wallets page.
              </span>
            </p>
          </>
        ) : null}

        <div className={s.footer}>
          <GeneralButton
            type='submit'
            fullWidth
            className={s.save}
            disabled={isHideSectionInvalid}
            loading={isSaving}
            loadingLabel='Saving…'>
            Save
          </GeneralButton>
        </div>
      </form>

      <ModalHideWalletConfirm
        visible={!!hideModal}
        mode={hideModal || 'confirm'}
        relockOption={relockOption}
        onCancel={onCancelHideModal}
        onConfirm={onConfirmHideAndSave}
      />
    </main>
  );
};

export default HideWallet;
