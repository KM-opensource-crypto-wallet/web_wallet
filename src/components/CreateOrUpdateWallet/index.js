import React from 'react';
import {Formik} from 'formik';
import {useSearchParams} from 'next/navigation';
import {wallet} from 'src/data/lists/data';
import ModalDelete from 'components/ModalDelete';
import useUpdateWallet from 'src/hooks/auth/updateWallet/useUpdateWallet';
import GeneralButton from 'src/components/Button';
import {
  ChevronRightIcon,
  EyeIcon,
  InfoIcon,
  KeyIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import {ClockIcon, TrashIcon} from 'components/Transactions/TxIcons';
import s from './CreateOrUpdateWallet.module.css';
import NameNewWallet from './NameNewWallet';
import Screen from 'components/Screen';

// A settings row: tinted icon, title + hint, optional trailing status pill
// and chevron.
const SettingsRow = ({
  icon,
  tone,
  title,
  hint,
  pill,
  pillTone,
  onClick,
  disabled,
  chevron = true,
}) => (
  <button type='button' className={s.row} disabled={disabled} onClick={onClick}>
    <span className={`${s.rowIcon} ${tone ? s[tone] : ''}`}>{icon}</span>
    <span className={s.rowText}>
      <span className={s.rowTitle}>{title}</span>
      {hint ? <span className={s.rowHint}>{hint}</span> : null}
    </span>
    {pill ? (
      <span className={`${s.pill} ${pillTone ? s[pillTone] : ''}`}>{pill}</span>
    ) : null}
    {chevron ? <ChevronRightIcon size={17} className={s.chevron} /> : null}
  </button>
);

// Wallet settings (rename, backups, hide, scan, remove) for `?walletName=`.
const UpdateWallet = () => {
  const {
    walletName,
    initialValues,
    validationSchema,
    handleSubmit,
    isSubmitting,
    wrong,
    validateNewWalletName,
    canDelete,
    showDeleteModal,
    openDeleteModal,
    onPressYes,
    onPressNo,
    isHidden,
    isScanAvailable,
    isScanningThisWallet,
    isScanningOtherWallet,
    isScanRowEnabled,
    scanStatusLabel,
    goToManualBackup,
    goToHideWallet,
    goToCoinSync,
  } = useUpdateWallet();

  const scanIcon = isScanningThisWallet ? (
    <span className={s.spinner} aria-label='Scanning' />
  ) : isScanningOtherWallet || !isScanAvailable ? (
    <ClockIcon size={19} />
  ) : (
    <SearchIcon size={19} />
  );

  return (
    <Screen className={s.page} title='Wallet settings' subtitle={walletName}>
      <Formik
        enableReinitialize={true}
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}>
        {({handleChange, handleBlur, handleSubmit: submit, values, errors}) => (
          <form
            className={s.column}
            noValidate
            onSubmit={event => {
              event.preventDefault();
              submit();
            }}>
            <section className={s.nameCard} aria-label='Wallet name'>
              <span className={s.avatar} aria-hidden='true'>
                {(values.name || walletName || '?').trim()[0]?.toUpperCase()}
              </span>
              <div className={s.field}>
                <label htmlFor='wallet-name' className={s.label}>
                  Wallet name
                </label>
                <div
                  className={`${s.inputBox} ${
                    errors.name || wrong ? s.inputBoxError : ''
                  }`}>
                  <input
                    id='wallet-name'
                    className={s.input}
                    name='name'
                    autoComplete='off'
                    onChange={handleChange('name')}
                    onBlur={() => {
                      validateNewWalletName(values.name);
                      handleBlur('currentPassword');
                    }}
                    value={values.name}
                  />
                </div>
                {errors.name ? (
                  <p className={s.error} role='alert'>
                    {errors.name}
                  </p>
                ) : wrong === true ? (
                  <p className={s.error} role='alert'>
                    Choose a different wallet name
                  </p>
                ) : null}
              </div>
            </section>

            <section className={s.section} aria-label='Secret phrase backups'>
              <span className={s.sectionLabel}>Secret phrase backups</span>
              <div className={s.card}>
                {wallet.map(item => {
                  const active = item.body === 'Active';
                  return (
                    <SettingsRow
                      key={item.title}
                      icon={<KeyIcon size={19} />}
                      title={item.title}
                      hint='Write down your secret phrase'
                      pill={item.body}
                      pillTone={active ? 'pillOk' : 'pillWarn'}
                      onClick={() => {
                        if (item.title === 'Manual Backup') {
                          goToManualBackup();
                        }
                      }}
                    />
                  );
                })}
              </div>
              <p className={s.note}>
                <InfoIcon size={16} />
                <span>
                  We highly recommend completing a manual backup to help prevent
                  the loss of your crypto.
                </span>
              </p>
            </section>

            <section className={s.section} aria-label='Wallet'>
              <span className={s.sectionLabel}>Wallet</span>
              <div className={s.card}>
                <SettingsRow
                  icon={<EyeIcon size={19} off />}
                  tone='toneNeutral'
                  title='Hide wallet'
                  hint={
                    isHidden
                      ? 'Hidden · unlock it with its secret code'
                      : 'Hide it behind a secret code'
                  }
                  pill={isHidden ? 'Hidden' : null}
                  onClick={goToHideWallet}
                />
                <SettingsRow
                  icon={scanIcon}
                  title='Scan coins'
                  hint={scanStatusLabel}
                  disabled={!isScanRowEnabled}
                  chevron={isScanRowEnabled}
                  onClick={goToCoinSync}
                />
              </div>
            </section>

            {canDelete ? (
              <section className={s.section} aria-label='Danger zone'>
                <span className={s.sectionLabel}>Danger zone</span>
                <div className={s.card}>
                  <SettingsRow
                    icon={<TrashIcon size={18} />}
                    tone='toneDanger'
                    title='Remove wallet'
                    hint='Removes it from this device only'
                    onClick={openDeleteModal}
                  />
                </div>
              </section>
            ) : null}

            <div className={s.footer}>
              <GeneralButton
                type='submit'
                fullWidth
                className={s.save}
                loading={isSubmitting}
                loadingLabel='Saving…'
                disabled={!!wrong}>
                Save changes
              </GeneralButton>
            </div>
          </form>
        )}
      </Formik>

      <ModalDelete
        walletName={walletName}
        onPressYes={onPressYes}
        onPressNo={onPressNo}
        visible={showDeleteModal}
      />
    </Screen>
  );
};

// Without `walletName` this is the name step of a new (created or imported)
// wallet; with it, the settings of an existing wallet.
const CreateOrUpdateWallet = () => {
  const walletName = useSearchParams().get('walletName');
  return walletName ? <UpdateWallet /> : <NameNewWallet />;
};

export default CreateOrUpdateWallet;
