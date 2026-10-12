import React from 'react';
import useNameNewWallet, {
  MAX_LENGTH,
} from 'src/hooks/auth/updateWallet/useNameNewWallet';
import AuthLayout, {BackBar, authStyles} from 'components/AuthLayout';
import GeneralButton from 'src/components/Button';
import s from './NameNewWallet.module.css';

const NameNewWallet = () => {
  const {
    name,
    setName,
    onNameChange,
    clearName,
    inputRef,
    trimmed,
    isImport,
    isDuplicate,
    isSubmitting,
    canSubmit,
    suggestions,
    goBack,
    handleSubmit,
  } = useNameNewWallet();

  return (
    <AuthLayout
      topBar={
        <BackBar
          title={isImport ? 'Import wallet' : 'Create wallet'}
          onBack={goBack}
        />
      }
      title='Name your wallet'
      subtitle='This is just a label for you — you can rename it anytime.'>
      <form className={authStyles.form} onSubmit={handleSubmit} noValidate>
        <div className={s.avatar} aria-hidden='true'>
          {trimmed ? trimmed[0].toUpperCase() : 'W'}
        </div>

        <div className={s.fieldBlock}>
          <label htmlFor='wallet-name' className={authStyles.label}>
            Wallet name
          </label>
          <div
            className={`${authStyles.field} ${s.nameField} ${
              isDuplicate ? authStyles.fieldError : ''
            }`}>
            <input
              ref={inputRef}
              id='wallet-name'
              name='name'
              className={authStyles.input}
              value={name}
              onChange={onNameChange}
              placeholder='e.g. Main Wallet'
              maxLength={MAX_LENGTH}
              autoComplete='off'
              autoFocus={true}
              aria-invalid={isDuplicate || undefined}
              aria-describedby='wallet-name-hint'
            />
            {name ? (
              <GeneralButton
                variant='icon'
                aria-label='Clear name'
                onClick={clearName}>
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'>
                  <path d='M18 6L6 18' />
                  <path d='M6 6l12 12' />
                </svg>
              </GeneralButton>
            ) : null}
          </div>
          <div id='wallet-name-hint' className={s.hintRow}>
            {isDuplicate ? (
              <span className={s.hintError} role='alert'>
                A wallet with this name already exists
              </span>
            ) : (
              <span>Only visible to you</span>
            )}
            <span className={s.count}>
              {name.length}/{MAX_LENGTH}
            </span>
          </div>
        </div>

        {suggestions.length ? (
          <div className={s.suggestions}>
            <span className={s.suggestionsLabel}>Suggestions</span>
            <div className={s.chips}>
              {suggestions.map(item => (
                <GeneralButton
                  key={item}
                  variant='chip'
                  onClick={() => setName(item)}>
                  {item}
                </GeneralButton>
              ))}
            </div>
          </div>
        ) : null}

        <div className={authStyles.footer}>
          <GeneralButton
            type='submit'
            fullWidth
            loading={isSubmitting}
            loadingLabel='Creating…'
            disabled={!canSubmit}>
            Next
          </GeneralButton>
        </div>
      </form>
    </AuthLayout>
  );
};

export default NameNewWallet;
