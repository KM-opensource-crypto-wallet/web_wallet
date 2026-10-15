'use client';
import React, {useEffect} from 'react';
import s from './AppRouting.module.css';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Loading from '../Loading';
import {ToastContainer} from 'react-toastify';
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from 'react-google-recaptcha-v3';
import {ThemeProvider} from '@mui/system';
import useAppRouting from 'src/hooks/auth/appRouting/useAppRouting';
import {captchaRef} from 'utils/apiCaptcha';
import DisabledView from 'components/DisabledView';
import CoinSyncWidget from 'components/CoinSyncWidget';
import {createDynamicTheme} from 'src/theme';
import {ToastIcon} from 'utils/toast';

const CaptchaSetup = () => {
  const {executeRecaptcha} = useGoogleReCaptcha();
  useEffect(() => {
    if (!executeRecaptcha) return;
    captchaRef.execute = executeRecaptcha;
    return () => {
      captchaRef.execute = null;
    };
  }, [executeRecaptcha]);
  return null;
};

function AppRouting({children, wlData}) {
  const {routingDone, disableMessage, themeType, themeColor} = useAppRouting({
    wlData,
  });

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}>
      <CaptchaSetup />
      <ThemeProvider theme={createDynamicTheme(themeColor)}>
        <div>
          {routingDone && !disableMessage ? (
            <div className={s.container}>
              <div className={s.navbarWrapper}>{<Header />}</div>
              <div className={s.mainWrapper}>
                <div className={s.side}>
                  <aside className={s.sidebarWrapper}>{<Sidebar />}</aside>
                </div>
                <div className={s.main}>{children}</div>
              </div>
            </div>
          ) : disableMessage ? (
            <DisabledView />
          ) : (
            <div className={s.mainContainer}>
              <Loading />
            </div>
          )}
        </div>
        <CoinSyncWidget />
        <ToastContainer
          position='bottom-right'
          draggable
          pauseOnHover
          icon={ToastIcon}
          theme={themeType === 'light' ? 'light' : 'dark'}
        />
      </ThemeProvider>
    </GoogleReCaptchaProvider>
  );
}

export default AppRouting;
