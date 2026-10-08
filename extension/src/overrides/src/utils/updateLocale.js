// Extension `utils/updateLocale`. On the web these are server actions on the
// NEXT_LOCALE cookie, and a change re-renders the server layout with the new
// messages. Here the locale lives in localStorage and the i18n provider
// (src/app/i18n.jsx) re-renders on change.
import {getDefaultLocale} from 'whitelabel/whiteLabelInfo';
import {readStoredLocale, setLocale} from '@ext/app/i18n';

export async function getUserLocale() {
  return readStoredLocale() || getDefaultLocale();
}

export async function isLocaleSet() {
  return readStoredLocale() != null;
}

export async function setUserLocale(locale) {
  setLocale(locale);
}
