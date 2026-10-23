// Locale + messages for the extension, replacing next-intl's server half
// (src/i18n/request.js, the NEXT_LOCALE cookie and the server layout).
import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {NextIntlClientProvider} from 'next-intl';

const STORAGE_KEY = 'NEXT_LOCALE';
const listeners = new Set();

export const readStoredLocale = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setLocale = locale => {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage blocked: the change still applies to this page.
  }
  listeners.forEach(listener => listener());
};

const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const loadMessages = async locale => {
  try {
    return (await import(`@web-original/src/locales/${locale}.json`)).default;
  } catch {
    return (await import('@web-original/src/locales/en.json')).default;
  }
};

export function I18nProvider({defaultLocale, children}) {
  const stored = useSyncExternalStore(
    subscribe,
    readStoredLocale,
    readStoredLocale,
  );
  const locale = stored || defaultLocale || 'en';
  const [messages, setMessages] = useState(null);

  useEffect(() => {
    let active = true;
    loadMessages(locale).then(loaded => {
      if (active) {
        setMessages(loaded);
        document.documentElement.lang = locale;
      }
    });
    return () => {
      active = false;
    };
  }, [locale]);

  if (!messages) {
    return null;
  }
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
