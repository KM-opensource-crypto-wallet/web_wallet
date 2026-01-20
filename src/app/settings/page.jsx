'use client';
import React, {useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {
  getLocalCurrency,
  getLockTimeDisplay,
  isChatOptions,
  isWalletReset,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  setResetWallet,
  updateChatOptions,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import s from './Settings.module.css';

const icons = require(`assets/images/settings`).default;
const AllIcons = require(`assets/images/icons`).default;
import Link from 'next/link';
import {FormControlLabel, Radio, RadioGroup, Switch} from '@mui/material';
import {Password, Security} from '@mui/icons-material';
import ModalConfirmEnableChatModal from 'components/ModalConfirmEnableChatModal';
import {useLocale, useTranslations} from 'next-intl';
import {setUserLocale} from 'src/utils/updateLocale';

const Settings = ({navigation}) => {
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const dispatch = useDispatch();
  // const [isFingerprintEnabled, setIsFingerprintEnabled] = useState(false);
  const localCurrency = useSelector(getLocalCurrency);
  const lockTimeDisplay = useSelector(getLockTimeDisplay);
  const chatOptions = useSelector(isChatOptions);
  const rateLimitCheck = useSelector(isWalletReset);
  const currentLocale = useLocale();
  const t = useTranslations('settings');

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

  const onChangeLocale = e => {
    setUserLocale(e.target.value);
  };

  const onChangeChatOptions = e => {
    const value = e?.target.checked;
    if (value) {
      setIsChatModalVisible(true);
    } else {
      dispatch(updateChatOptions(value));
    }
  };
  const onChangeApplyRateLimit = e => {
    const value = e?.target.checked;
    dispatch(setResetWallet(value));
  };
  return (
    <div className={s.container}>
      <div className={s.list}>
        <p className={s.title}>Account settings</p>
        <Link href='/settings/local-currency' className={s.btn}>
          {icons.localCurrency}
          <div className={s.box}>
            <p className={s.btnTitle}>{t('localCurrency')}</p>
            <p className={s.btnText}>{localCurrency}</p>
          </div>
        </Link>
        <Link href='/manage-coins' className={s.btn}>
          {icons.setCurrency}
          <div className={s.box}>
            <p className={s.btnTitle}>{t('coinList')}</p>
            <p className={s.btnText}>Manage your coin list</p>
          </div>
        </Link>
        <Link href='/settings/display-theme' className={s.btn}>
          {icons.setCurrency}
          <div className={s.box}>
            <p className={s.btnTitle}>{t('theme')}</p>
            <p className={s.btnText}>Manage your app theme</p>
          </div>
        </Link>
        <p className={s.title}>Security</p>
        <Link href='/settings/change-password' className={s.btn}>
          <Password />
          <div className={s.box}>
            <p className={s.btnTitle}>{t('changePassword')}</p>
            <p className={s.btnText}>Change or reset your password</p>
          </div>
        </Link>
        <Link href='/settings/autolock' className={s.btn}>
          {icons.change}
          <div className={s.box}>
            <p className={s.btnTitle}>{t('autoLock')}</p>
            <p className={s.btnText}>{lockTimeDisplay}</p>
          </div>
        </Link>
        <Link href='/verify/verify-login' className={s.btn}>
          {icons.showPhrase}

          <div className={s.box}>
            <p className={s.btnTitle}>{t('showSeedPhrase')}</p>
            <p className={s.btnText}>Manage your seed phrase</p>
          </div>
        </Link>
        <p className={s.title}>General</p>
        <div className={s.btn}>
          {icons.changeLanguage}
          <div className={s.box}>
            <p className={s.btnTitle}>Change Language</p>
            <div>
              <RadioGroup value={currentLocale} onChange={onChangeLocale} row>
                {locales.map(locale => (
                  <FormControlLabel
                    key={locale.value}
                    value={locale.value}
                    control={<Radio color='warning' />}
                    label={locale.label}
                  />
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>
        <Link href='/about/terms-conditions' className={s.btn}>
          {icons.mail}
          <div className={s.box}>
            <p className={s.btnTitle}>{t('termsAndConditions')}</p>
          </div>
        </Link>
        {/* /////////////////////////////// */}
        <Link href='/about/privacy-policy' className={s.btn}>
          {icons.privacy}
          <div className={s.box}>
            <p className={s.btnTitle}>{t('privacyPolicy')}</p>
          </div>
        </Link>
        <p className={s.title}>Wallet Settings</p>
        <Link href='/settings/derive-address' className={s.btn}>
          {icons.setCurrency}
          <div className={s.box}>
            <p className={s.btnTitle}>{'EVM, SOL & TRX addresses'}</p>
            <p className={s.btnText}>
              {'Manage multiple addresses for EVM, SOL and TRX'}
            </p>
          </div>
        </Link>
        <div className={s.btn}>
          {AllIcons.chatIcon}
          <div className={s.box}>
            <div className={s.subBox}>
              <p className={s.btnTitle}>{'Blockchain Chat'}</p>
              <p className={s.btnText}>
                {'Messaging services with ethereum address'}
              </p>
            </div>
            <Switch
              checked={chatOptions}
              defaultChecked={chatOptions}
              onChange={onChangeChatOptions}
              color='warning'
            />
          </div>
        </div>
        <div className={s.btn}>
          <Security />
          <div className={s.box}>
            <div className={s.subBox}>
              <p className={s.btnTitle}>{'Wallet Reset on Failure'}</p>
              <p className={s.btnText}>
                {
                  'The wallet resets automatically after 5 failed password attempts.'
                }
              </p>
            </div>
            <Switch
              checked={rateLimitCheck}
              defaultChecked={rateLimitCheck}
              onChange={onChangeApplyRateLimit}
              color='warning'
            />
          </div>
        </div>
        <Link href='/settings/chat-blocked' className={s.btn}>
          {AllIcons.blockedIcon}
          <div className={s.box}>
            <p className={s.btnTitle}>{'Blockchain Chat Blocked'}</p>
            <p className={s.btnText}>
              {' Manage blocked addresses for blockchain chat'}
            </p>
          </div>
        </Link>
        <Link href={'/settings/privacy-mode'} className={s.btn}>
          <Security />
          <div className={s.box}>
            <p className={s.btnTitle}>{'Privacy Mode'}</p>
            <p className={s.btnText}>
              {'Enhance privacy by auto-resetting addresses on app restart'}
            </p>
          </div>
        </Link>
      </div>
      <ModalConfirmEnableChatModal
        visible={isChatModalVisible}
        hideModal={isYesClicked => {
          setIsChatModalVisible(false);
          dispatch(updateChatOptions(!!isYesClicked));
        }}
      />
      {/* <ModalFingerprint
        visible={showModalVarify}
        hideModal={setShowModalVarify}
        navigation={navigation}
      />
      <ModalFingerprintVerification
        visible={showModalPass}
        hideModal={setShowModalPass}
      /> */}
    </div>
  );
};

export default Settings;
