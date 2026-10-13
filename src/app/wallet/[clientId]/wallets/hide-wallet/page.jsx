'use client';

import React from 'react';
import ModalHideWalletConfirm from 'components/ModalHideWalletConfirm';
import GeneralButton from 'components/Button';
import {
  ChevronLeftIcon,
  EyeIcon,
  InfoIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import {SECRET_CODE_MAX_LENGTH, SECRET_CODE_MIN_LENGTH} from 'utils/hideWallet';
import useWallets from 'src/hooks/protectedRoutes/wallet/wallets/useWallets';
import s from './HideWallet.module.css';

const HideWallet = () => {
  const {
    goBack,
    walletName,
    openInfoModal,
    isHideEnabled,
    isHideToggleDisabled,
    toggleHide,
    toggleError,
    hasExistingHideSettings,
    secretCode,
    secretCodeError,
    onSecretCodeChange,
    showCode,
    toggleShowCode,
    relockOptions,
    displayRelockOption,
    handleRelockChange,
    isHideSectionInvalid,
    isSaving,
    onSubmitForm,
    hideModal,
    relockOption,
    onCancelHideModal,
    onConfirmHideAndSave,
  } = useWallets();

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={goBack}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <div className={s.heading}>
          <h1 className={s.headingTitle}>Hide wallet</h1>
          {walletName ? (
            <span className={s.headingSub}>{walletName}</span>
          ) : null}
        </div>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='How hiding works'
          onClick={openInfoModal}>
          <InfoIcon size={20} />
        </GeneralButton>
      </div>

      <form className={s.column} noValidate onSubmit={onSubmitForm}>
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
              onClick={toggleHide}>
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
                {hasExistingHideSettings ? (
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
                  onChange={onSecretCodeChange}
                  placeholder={
                    hasExistingHideSettings
                      ? 'Leave blank to keep the current code'
                      : 'Choose a secret code'
                  }
                  aria-invalid={!!secretCodeError}
                />
                <button
                  type='button'
                  className={s.reveal}
                  aria-label={showCode ? 'Hide code' : 'Show code'}
                  onClick={toggleShowCode}>
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
                {relockOptions.map(option => {
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
