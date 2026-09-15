import {Roboto} from 'next/font/google';
import './globals.css';
import 'utils/bigNumberConfig';
import StateProvider from '../redux/StateProvider';
import AppRouting from 'components/AppRouting';
import ThemeProvider from 'theme/ThemeContext';
import React from 'react';
import {NextIntlClientProvider} from 'next-intl';
import {getLocale, getMessages} from 'next-intl/server';
import {getWhiteLabelInfo} from 'dok-wallet-blockchain-networks/service/dokApi';
import {headers} from 'next/headers';
import {isLocaleSet} from 'utils/updateLocale';
import AuthProvider from 'components/AuthProvider';
import {captureError, setWhiteLabelContext} from 'services/logger';
import {rememberWhiteLabelForHost} from 'whitelabel/serverWhiteLabel';

// Next signals "this route must render per request" by throwing from
// headers()/cookies() during static prerender (digest DYNAMIC_SERVER_USAGE).
const isNextDynamicUsageError = error =>
  error?.digest === 'DYNAMIC_SERVER_USAGE';

const roboto = Roboto({
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export default async function RootLayout({children}) {
  let locale;
  let messages;
  let wlData;
  let firstHost = '';

  try {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
    firstHost = host.split(':')[0];
    const resp = await getWhiteLabelInfo(firstHost);
    wlData = resp?.data;
  } catch (error) {
    // `headers()` throws Next's internal bail-out while a page is being
    // prerendered at build time; that is not a defect to report.
    if (!isNextDynamicUsageError(error)) {
      captureError(error, {tags: {area: 'layout', op: 'whitelabel_fetch'}});
    }
  }

  // Server-side events/logs for this request carry the whitelabel too, and
  // route handlers / onRequestError reuse what the backend said for this host.
  rememberWhiteLabelForHost(firstHost, wlData);
  setWhiteLabelContext({host: firstHost, name: wlData?.name, id: wlData?._id});

  try {
    const isLocalExist = await isLocaleSet();
    if (isLocalExist) {
      locale = await getLocale();
    } else {
      locale = wlData?.defaultLocale || 'en';
    }
    messages = await getMessages({locale});
  } catch (error) {
    if (!isNextDynamicUsageError(error)) {
      captureError(error, {tags: {area: 'layout', op: 'locale'}});
    }
    locale = 'en';
    messages = {};
  }

  const googleSiteVerification = wlData?.metadata?.google_site_verification;
  const title = wlData?.title || 'Dok Wallet';
  const appIcon = wlData?.appIcon?.light ?? '/dokwallet.ico';
  return (
    <html lang={locale}>
      <head>
        {typeof googleSiteVerification === 'string' &&
          !!googleSiteVerification && (
            <meta
              name='google-site-verification'
              content={googleSiteVerification}
            />
          )}
        <link rel='icon' href={appIcon} />
        <title>{title}</title>
      </head>
      {wlData ? (
        <ThemeProvider>
          <body className={roboto.variable}>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <StateProvider>
                <AuthProvider>
                  <AppRouting wlData={wlData}>{children}</AppRouting>
                </AuthProvider>
              </StateProvider>
            </NextIntlClientProvider>
          </body>
        </ThemeProvider>
      ) : (
        <body>
          <h3 style={{textAlign: 'center', flex: 1}}>Something went wrong</h3>
        </body>
      )}
    </html>
  );
}
