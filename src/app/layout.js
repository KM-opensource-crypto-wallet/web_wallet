import {Roboto} from 'next/font/google';
import './globals.css';
import StateProvider from '../redux/StateProvider';
import AppRouting from 'components/AppRouting';
import ThemeProvider from 'theme/ThemeContext';
import React from 'react';
import {NextIntlClientProvider} from 'next-intl';
import {getLocale, getMessages} from 'next-intl/server';
import {getWhiteLabelInfo} from 'dok-wallet-blockchain-networks/service/dokApi';
import {headers} from 'next/headers';
import {isLocaleSet} from 'utils/updateLocale';

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

  try {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
    const firstHost = host.split(':')[0];
    const resp = await getWhiteLabelInfo(firstHost);
    wlData = resp?.data;
  } catch (error) {
    console.error('Error in getting white label:', error);
  }

  try {
    const isLocalExist = await isLocaleSet();
    if (isLocalExist) {
      locale = await getLocale();
    } else {
      locale = wlData?.defaultLocale || 'en';
    }
    messages = await getMessages({locale});
  } catch (error) {
    console.error('Error loading locale or messages:', error);
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
                <AppRouting wlData={wlData}>{children}</AppRouting>
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
