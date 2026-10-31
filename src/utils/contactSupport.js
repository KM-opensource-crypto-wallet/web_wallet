import {toast} from 'react-toastify';
import {getAppName, getContactUsEmail} from 'whitelabel/whiteLabelInfo';
import {WL_APP_NAME} from 'utils/wlData';
import {getSupportId} from 'services/logger';

// Mirrors the mobile app's utils/contactSupport.js. The Support ID is
// prefilled so support can find the user's Sentry logs (`user.id:<id>`)
// without asking for anything personal.
const SUPPORT_TELEGRAM = {
  dokwallet: 'https://t.me/dokwallet',
  kimlwallet: 'https://t.me/kimlwallet',
};

const supportIdDraft = () => {
  const supportId = getSupportId();
  return supportId ? `Support ID: ${supportId}\n\n` : '';
};

// Telegram is offered only for brands that have a support account.
export const getSupportTelegramUrl = () => SUPPORT_TELEGRAM[getAppName()] || '';

export const buildSupportEmailUrl = () => {
  const subject = encodeURIComponent(`${WL_APP_NAME} support`);
  const draft = supportIdDraft();
  const body = draft ? `&body=${encodeURIComponent(draft)}` : '';
  return `mailto:${getContactUsEmail()}?subject=${subject}${body}`;
};

// t.me/<username>?text= pre-fills the message box (Telegram deep links).
export const buildSupportTelegramUrl = () => {
  const url = getSupportTelegramUrl();
  const draft = supportIdDraft();
  return url && draft ? `${url}?text=${encodeURIComponent(draft)}` : url;
};

export const openSupportEmail = () => {
  try {
    window.open(buildSupportEmailUrl());
  } catch (e) {
    console.error('error in open emails', e);
    toast.error(`Couldn't open an email client`);
  }
};

export const openSupportTelegram = () => {
  try {
    const url = buildSupportTelegramUrl();
    if (url) {
      window.open(url);
    }
  } catch (e) {
    console.error('error in open Telegram', e);
    toast.error(`Couldn't open Telegram`);
  }
};
