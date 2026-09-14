// Shared with the `'use server'` module utils/updateLocale.js, which may only
// export async functions, so the cookie name and the client-side check live
// here. next-intl reads the same cookie on public pages.
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

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
