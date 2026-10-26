'use client';
import {walletRoutes} from 'utils/routes';
import React from 'react';
import {useDispatch} from 'react-redux';
import {setResetWallet} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import s from './Settings.module.css';
import Link from 'next/link';
import {getPrivacyUrl, getTermsUrl} from 'whitelabel/whiteLabelInfo';
import {useLocale, useTranslations} from 'next-intl';
import {setUserLocale} from 'src/utils/updateLocale';
import {isBackupRestoreEnabled} from 'whitelabel/whiteLabelInfo';
import {addBreadcrumb, captureError, logger} from 'services/logger';
import {showToast} from 'utils/toast';
import {getWebLockTimeLabel} from 'utils/autoLock';
import Screen from 'components/Screen';
import {ChevronRightIcon} from 'components/Home/HomeIcons';
import {ExternalLinkIcon} from 'components/Transactions/TxIcons';
import useWallet from 'src/hooks/wallet/useWallet';
import {
  BranchesIcon,
  BugIcon,
  CloudDownIcon,
  CloudUpIcon,
  CoinsIcon,
  CurrencyIcon,
  DocIcon,
  EyeOffIcon,
  GlobeIcon,
  LockIcon,
  PaletteIcon,
  PhraseIcon,
  PlayIcon,
  ResetIcon,
  ServerIcon,
  ShieldIcon,
  TimerIcon,
} from './SettingsIcons';

// Debug-only row for verifying the Sentry pipeline end to end (event, log,
// breadcrumb, scrubbing). Hidden in release unless SENTRY_DEV_TOOLS is set.
const SHOW_SENTRY_DEV_TOOLS =
  process.env.ENV_MODE === 'DEV' || process.env.SENTRY_DEV_TOOLS === 'true';

const locales = [
  {
    label: 'English',
    value: 'en',
  },
  {
    label: 'Hebrew',
    value: 'he',
  },
];

const RowBody = ({icon: Icon, title, text, trailing}) => (
  <>
    <span className={s.rowIcon}>
      <Icon size={19} />
    </span>
    <span className={s.rowText}>
      <span className={s.rowTitle}>{title}</span>
      {text ? <span className={s.rowHint}>{text}</span> : null}
    </span>
    {trailing}
  </>
);

// One settings entry: an in-app link, an external link, or a button.
const Row = ({href, external, onClick, ...body}) => {
  if (external) {
    return (
      <a
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className={s.row}>
        <RowBody
          {...body}
          trailing={<ExternalLinkIcon size={16} className={s.rowChevron} />}
        />
      </a>
    );
  }
  const trailing = <ChevronRightIcon size={17} className={s.rowChevron} />;
  if (href) {
    return (
      <Link href={href} className={s.row}>
        <RowBody {...body} trailing={trailing} />
      </Link>
    );
  }
  return (
    <button type='button' className={s.row} onClick={onClick}>
      <RowBody {...body} trailing={trailing} />
    </button>
  );
};

const Section = ({title, children}) => (
  <section className={s.section} aria-label={title}>
    <h2 className={s.sectionLabel}>{title}</h2>
    <div className={s.card}>{children}</div>
  </section>
);

const Settings = () => {
  const dispatch = useDispatch();
  const {
    localCurrency,
    lockTime,
    rateLimitCheck,
    tutorialVideos,
    currentWalletClientId,
  } = useWallet();
  const lockTimeDisplay = getWebLockTimeLabel(lockTime);
  // Before a wallet exists (password set, wallets reset or all deleted) the
  // legacy /manage-coins forwarder resolves this once one does, instead of
  // linking at /wallet/undefined/manage-coins.
  const manageCoinsHref = currentWalletClientId
    ? walletRoutes.manageCoins(currentWalletClientId)
    : '/manage-coins';
  const currentLocale = useLocale();
  const t = useTranslations('settings');

  const onChangeLocale = async value => {
    if (value === currentLocale) {
      return;
    }
    try {
      await setUserLocale(value);
    } catch (e) {
      showToast({type: 'errorToast', title: 'Failed to change language'});
    }
  };
  const onChangeApplyRateLimit = value => {
    dispatch(setResetWallet(value));
  };

  const onPressSentryTest = () => {
    // Everything below must show up redacted in Sentry: the breadcrumb
    // mnemonic, the privateKey attribute, and the phrase/body extras.
    addBreadcrumb(
      'test',
      'abandon ability able about above absent absorb abstract absurd abuse access accident',
    );
    logger.info('sentry.test_log', {
      tx_hash: 'a'.repeat(64),
      privateKey: 'b'.repeat(64),
    });
    captureError(new Error('Sentry test event'), {
      tags: {test: 'true'},
      extra: {
        phrase: 'zoo '.repeat(11) + 'wrong',
        body: {secret: 'should-not-appear'},
        note: 'sent from Settings > Send Sentry test event',
      },
    });
    showToast({
      type: 'successToast',
      title: 'Sentry test sent',
      message: 'Check the dashboard for the event and log',
    });
  };

  return (
    <Screen className={s.page} title='Settings'>
      <div className={s.column}>
        <Section title='Account'>
          <Row
            href='/settings/local-currency'
            icon={CurrencyIcon}
            title={t('localCurrency')}
            text={localCurrency}
          />
          <Row
            href={manageCoinsHref}
            icon={CoinsIcon}
            title={t('coinList')}
            text='Manage your coin list'
          />
          <Row
            href='/settings/display-theme'
            icon={PaletteIcon}
            title={t('theme')}
            text='Manage your app theme'
          />
        </Section>

        <Section title='Security'>
          <Row
            href='/settings/change-password'
            icon={LockIcon}
            title={t('changePassword')}
            text='Change or reset your password'
          />
          <Row
            href='/settings/autolock'
            icon={TimerIcon}
            title={t('autoLock')}
            text={lockTimeDisplay}
          />
          <Row
            href='/verify/verify-login'
            icon={PhraseIcon}
            title={t('showSeedPhrase')}
            text='Manage your seed phrase'
          />
        </Section>

        <Section title='General'>
          <div className={s.row}>
            <RowBody
              icon={GlobeIcon}
              title='Language'
              trailing={
                <div
                  className={s.segmented}
                  role='radiogroup'
                  aria-label='Language'>
                  {locales.map(locale => (
                    <button
                      key={locale.value}
                      type='button'
                      role='radio'
                      aria-checked={currentLocale === locale.value}
                      className={`${s.segment} ${
                        currentLocale === locale.value ? s.segmentActive : ''
                      }`}
                      onClick={() => onChangeLocale(locale.value)}>
                      {locale.label}
                    </button>
                  ))}
                </div>
              }
            />
          </div>
          {SHOW_SENTRY_DEV_TOOLS && (
            <Row
              onClick={onPressSentryTest}
              icon={BugIcon}
              title='Send Sentry test event'
              text='Debug only: verifies error, log and redaction'
            />
          )}
          {tutorialVideos?.length > 0 && (
            <Row
              href='/settings/tutorial-videos'
              icon={PlayIcon}
              title='Tutorial Videos'
              text='Learn how to use wallet features'
            />
          )}
          <Row
            external
            href={getTermsUrl()}
            icon={DocIcon}
            title={t('termsAndConditions')}
          />
          <Row
            external
            href={getPrivacyUrl()}
            icon={ShieldIcon}
            title={t('privacyPolicy')}
          />
        </Section>

        <Section title='Wallet'>
          {isBackupRestoreEnabled() && (
            <>
              <Row
                href='/settings/backup'
                icon={CloudUpIcon}
                title='Backup Wallets'
                text='Backup wallets to Google Drive'
              />
              <Row
                href='/settings/restore'
                icon={CloudDownIcon}
                title='Restore Wallets'
                text='Restore wallets from Google Drive'
              />
            </>
          )}
          <Row
            href='/settings/custom-rpc'
            icon={ServerIcon}
            title='Custom RPC'
            text='Add your custom RPC URLs.'
          />
          <Row
            href='/settings/derive-address'
            icon={BranchesIcon}
            title='EVM, SOL & TRX addresses'
            text='Manage multiple addresses for EVM, SOL and TRX'
          />
          <div className={s.row}>
            <RowBody
              icon={ResetIcon}
              title='Wallet Reset on Failure'
              text='The wallet resets automatically after 5 failed password attempts.'
              trailing={
                <button
                  type='button'
                  role='switch'
                  aria-checked={!!rateLimitCheck}
                  aria-label='Wallet reset on failure'
                  className={`${s.switch} ${rateLimitCheck ? s.switchOn : ''}`}
                  onClick={() => onChangeApplyRateLimit(!rateLimitCheck)}>
                  <span className={s.knob} />
                </button>
              }
            />
          </div>
          <Row
            href='/settings/privacy-mode'
            icon={EyeOffIcon}
            title='Privacy Mode'
            text='Enhance privacy by auto-resetting addresses on app restart'
          />
        </Section>
      </div>
    </Screen>
  );
};

export default Settings;
