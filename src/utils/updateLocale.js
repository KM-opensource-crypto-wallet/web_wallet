'use server';

// import {defaultLocale} from './config';
import {cookies} from 'next/headers';
import {getDefaultLocale} from 'src/whitelabel/whiteLabelInfo';
import {LOCALE_COOKIE_NAME, isLocaleTag} from 'src/utils/localeCookie';

// This cookie name is used by `next-intl` on the public pages too. By
// reading/writing to this locale, we can ensure that the user's locale
// is consistent across public and private pages. In case you save the
// locale of registered users in a database, you can of course also use
// that instead when the user is logged in.
const COOKIE_NAME = LOCALE_COOKIE_NAME;

// Every export here is a public Server Action endpoint: arguments and cookie
// values are client-controlled, so only a locale-tag string is ever stored or
// returned (see isLocaleTag).
export async function getUserLocale() {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return isLocaleTag(value) ? value : getDefaultLocale();
}

export async function isLocaleSet() {
  return isLocaleTag((await cookies()).get(COOKIE_NAME)?.value);
}

export async function setUserLocale(locale) {
  if (!isLocaleTag(locale)) {
    return;
  }
  (await cookies()).set(COOKIE_NAME, locale);
}
