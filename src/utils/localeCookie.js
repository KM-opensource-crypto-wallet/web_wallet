// Shared with the `'use server'` module utils/updateLocale.js, which may only
// export async functions, so the cookie name and the client-side check live
// here. next-intl reads the same cookie on public pages.
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

// BCP 47 language-tag shape: a 2-3 letter language plus up to three subtags
// (en, he, pt-BR, zh-Hant-TW). setUserLocale is a Server Action, so its
// argument is whatever the POST body decoded to; a scanner sent a Flight
// promise reference that the next render then awaited
// (DOKWALLET-WALLET-WEB-1N, -1Q). Only strings of this shape reach the cookie
// or next-intl.
const LOCALE_TAG_RE = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,3}$/;

export const isLocaleTag = value =>
  typeof value === 'string' && LOCALE_TAG_RE.test(value);

// The whitelabel's default comes from the backend; a malformed one would be
// refused by setUserLocale on every page load, so fall back to English.
export const resolveDefaultLocale = value =>
  isLocaleTag(value) ? value : 'en';

// The cookie is set without HttpOnly, so the browser can see whether a locale
// was already persisted and skip the server-action round trip on load.
export const hasLocaleCookie = () => {
  if (typeof document === 'undefined') {
    return false;
  }
  return document.cookie
    .split(';')
    .some(part => part.trim().startsWith(`${LOCALE_COOKIE_NAME}=`));
};
