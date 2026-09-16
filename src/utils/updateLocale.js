'use server';

// import {defaultLocale} from './config';
import {cookies} from 'next/headers';
import {getDefaultLocale} from 'src/whitelabel/whiteLabelInfo';
import {LOCALE_COOKIE_NAME} from 'src/utils/localeCookie';

// This cookie name is used by `next-intl` on the public pages too. By
// reading/writing to this locale, we can ensure that the user's locale
// is consistent across public and private pages. In case you save the
// locale of registered users in a database, you can of course also use
// that instead when the user is logged in.
const COOKIE_NAME = LOCALE_COOKIE_NAME;

export async function getUserLocale() {
  return (await cookies()).get(COOKIE_NAME)?.value || getDefaultLocale();
}

export async function isLocaleSet() {
  return (await cookies()).get(COOKIE_NAME) !== undefined;
}

export async function setUserLocale(locale) {
  (await cookies()).set(COOKIE_NAME, locale);
}
