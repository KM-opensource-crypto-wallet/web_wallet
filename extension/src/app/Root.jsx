// The extension's replacement for web_wallet/src/app/layout.js (a server
// component): same provider tree, with the white-label data loaded on the
// client and the hash router rendering the pages.
import React, {useEffect, useState} from 'react';
import StateProvider from 'redux/StateProvider';
import AppRouting from 'components/AppRouting';
import ThemeProvider from 'theme/ThemeContext';
import AuthProvider from 'components/AuthProvider';
import {captureError, setWhiteLabelContext} from 'services/logger';
import {setupWebCaptchaInterceptor} from 'utils/apiCaptcha';
import RouteOutlet from '@ext/router/RouteOutlet';
import {I18nProvider} from './i18n';
import SessionSync from './SessionSync';
import {loadWhiteLabel} from './whiteLabel';

const setIcon = href => {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
};

export default function Root() {
  const [wlData, setWlData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadWhiteLabel().then(
      data => {
        if (!active) return;
        // Before any app request (AppRouting fires some before its own
        // setWhiteLabelInfo effect has run).
        setupWebCaptchaInterceptor(data?.name?.toLowerCase());
        setWhiteLabelContext({
          host: process.env.EXT_WHITE_LABEL_DOMAIN,
          name: data?.name,
          id: data?._id,
        });
        document.title = data?.title || process.env.EXT_BRAND_NAME;
        setIcon(data?.appIcon?.light ?? '/dokwallet.ico');
        setWlData(data);
      },
      error => {
        captureError(error, {tags: {area: 'layout', op: 'whitelabel_fetch'}});
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  if (!wlData) {
    return failed ? (
      <div style={{textAlign: 'center', padding: 24}}>
        <h3>Something went wrong</h3>
        <button
          type='button'
          onClick={() => {
            setFailed(false);
            setAttempt(value => value + 1);
          }}>
          Try again
        </button>
      </div>
    ) : null;
  }

  return (
    <ThemeProvider>
      <I18nProvider defaultLocale={wlData.defaultLocale}>
        <StateProvider>
          <AuthProvider>
            <SessionSync />
            <AppRouting wlData={wlData}>
              <RouteOutlet />
            </AppRouting>
          </AuthProvider>
        </StateProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
