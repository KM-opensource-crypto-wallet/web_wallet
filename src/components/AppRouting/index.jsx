'use client';
import React, {useCallback, useContext, useEffect, useState} from 'react';
import s from './AppRouting.module.css';
import {usePathname, useSearchParams} from 'next/navigation';
import ReactGA from 'react-ga4';
import Header from '../Header';
import Sidebar from '../Sidebar';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {getUserPassword} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {useRouter} from 'next/navigation';
import {
  checkNewsAvailable,
  fetchCurrencies,
} from 'dok-wallet-blockchain-networks/redux/currency/currencySlice';
import {ToastContainer} from 'react-toastify';
import {ThemeContext} from 'theme/ThemeContext';
import {isReduxStoreLoaded} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import {
  getMasterClientId,
  selectWalletConnectSessions,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  captureError,
  setUserContext,
  setWhiteLabelContext,
} from 'services/logger';
import {initWalletConnect} from 'dok-wallet-blockchain-networks/service/walletconnect';
import {
  clearWalletConnectStorageCache,
  createAIDIfNotExists,
  getLastActiveTime,
  setLastActiveTime,
} from 'utils/localStorageData';
import {getLockTime} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import Loading from '../Loading';
import {
  getWalletConnectDetails,
  setWhiteLabelInfo,
} from 'whitelabel/whiteLabelInfo';
import {captchaRef} from 'utils/apiCaptcha';
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from 'react-google-recaptcha-v3';

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
import {fetchSupportedBuyCryptoCurrency} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProviderSlice';
import {fetchRPCUrl} from 'dok-wallet-blockchain-networks/rpcUrls/rpcUrls';
import {
  getDisableMessage,
  getGoogleAnalyticsKey,
} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProvidersSelectors';
import DisabledView from 'components/DisabledView';
import {MainNavigation} from 'utils/navigation';

import {
  createIfNotExistsMasterClientId,
  reassignCurrentWalletIfHidden,
  resetCoinsToDefaultAddressForPrivacyMode,
  resetIsAdding50MoreAddresses,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {isLocaleSet, setUserLocale} from 'src/utils/updateLocale';
import {masterClickHost, publicRoutes, allPublicRoutes} from 'utils/common';
import {setWLAppName} from 'utils/wlData';
import {ThemeProvider} from '@mui/system';
import {createDynamicTheme} from 'src/theme';
import CoinSyncWidget from 'components/CoinSyncWidget';

function AppRouting({children, wlData}) {
  const password = useSelector(getUserPassword);
  const routing = useRouter();
  const dispatch = useDispatch();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {themeType} = useContext(ThemeContext);
  const isReduxStoreLoad = useSelector(isReduxStoreLoaded);
  const walletConnectSessions = useSelector(
    selectWalletConnectSessions,
    shallowEqual,
  );
  const [rountingDone, setRoutingDone] = useState(false);

  const disableMessage = useSelector(getDisableMessage);
  const googleAnalyticsKey = useSelector(getGoogleAnalyticsKey);
  const lockTime = useSelector(getLockTime);
  const masterClientId = useSelector(getMasterClientId);

  useEffect(() => {
    if (googleAnalyticsKey) {
      ReactGA.initialize(googleAnalyticsKey);
    }
  }, [googleAnalyticsKey]);

  // Attribute every event/log to this browser profile. The id is created after
  // rehydrate (createIfNotExistsMasterClientId) and cleared on wallet reset.
  useEffect(() => {
    setUserContext(masterClientId);
  }, [masterClientId]);

  useEffect(() => {
    let routeName = pathname;
    if (pathname === '/home/transactions') {
      routeName = 'TransactionList';
    } else if (pathname?.startsWith('/home/transactions/')) {
      routeName = 'TransactionDetails';
    }
    MainNavigation.setCurrentRouteName(routeName);
  }, [pathname]);

  useEffect(() => {
    MainNavigation.setNavigator(routing.push.bind(routing));
  }, [routing]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const ACTIVITY_THROTTLE_MS = 5000;
    let lastWrite = 0;
    const isReloadShortcut = e =>
      e.type === 'keydown' &&
      (e.key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === 'r'));
    const handleActivity = e => {
      if (isReloadShortcut(e)) {
        return;
      }
      const now = Date.now();
      if (now - lastWrite > ACTIVITY_THROTTLE_MS) {
        lastWrite = now;
        setLastActiveTime();
      }
    };
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'wheel'];
    activityEvents.forEach(event =>
      window.addEventListener(event, handleActivity, {passive: true}),
    );
    return () => {
      activityEvents.forEach(event =>
        window.removeEventListener(event, handleActivity),
      );
    };
  }, []);

  useEffect(() => {
    const setUpWindowHeight = () => {
      const appHeight = () => {
        const doc = document.documentElement;
        doc.style.setProperty('--app-height', `${window.innerHeight}px`);
      };
      window.addEventListener('resize', appHeight);
      appHeight();
    };
    if (typeof window !== 'undefined') {
      setUpWindowHeight();
    } else {
      setTimeout(() => {
        setUpWindowHeight();
      }, 2000);
    }
  }, []);

  const redirectToLoginOnTimeout = useCallback(() => {
    const currentSearchString = searchParams?.toString();
    const searchString = currentSearchString
      ? `${currentSearchString}&redirectRoute=${pathname}`
      : `redirectRoute=${pathname}`;
    routing.replace(`/auth/login?${searchString}`);
  }, [pathname, searchParams, routing]);

  useEffect(() => {
    if (typeof window === 'undefined' || !password || !(lockTime > 0)) {
      return;
    }
    const isProtectedRoute =
      !pathname?.includes('/auth') &&
      pathname !== '/' &&
      !publicRoutes.includes(pathname) &&
      !allPublicRoutes.includes(pathname);
    if (!isProtectedRoute) {
      return;
    }
    const AUTO_LOCK_CHECK_INTERVAL_MS = 5000;
    const intervalId = setInterval(() => {
      const lastActiveTime = getLastActiveTime();
      const elapsedMinutesSinceLastActive = lastActiveTime
        ? (Date.now() - lastActiveTime) / (1000 * 60)
        : Infinity;
      if (elapsedMinutesSinceLastActive >= lockTime) {
        clearInterval(intervalId);
        redirectToLoginOnTimeout();
      }
    }, AUTO_LOCK_CHECK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [password, lockTime, pathname, redirectToLoginOnTimeout]);

  useEffect(() => {
    if (isReduxStoreLoad) {
      dispatch(resetIsAdding50MoreAddresses());
      dispatch(createIfNotExistsMasterClientId());
      let searchString = searchParams?.toString();
      if (
        !pathname?.includes('/auth') &&
        pathname !== '/' &&
        !publicRoutes.includes(pathname)
      ) {
        let redirectRoute = pathname;
        searchString = searchString
          ? `${searchString}&redirectRoute=${redirectRoute}`
          : `redirectRoute=${redirectRoute}`;
      }
      for (const key of searchParams.keys()) {
        if (key?.toLowerCase() === 'aid') {
          createAIDIfNotExists(searchParams.get(key));
        }
      }
      dispatch(resetCoinsToDefaultAddressForPrivacyMode());
      // On (re)load, RELAUNCH/BACKGROUND wallets are re-hidden by the persist
      // transform; if the current wallet is now hidden, reassign to a visible one.
      dispatch(reassignCurrentWalletIfHidden());
      dispatch(fetchSupportedBuyCryptoCurrency({fromDevice: 'web'}));
      dispatch(checkNewsAvailable({key: 'web'}));
      fetchRPCUrl();
      dispatch(fetchCurrencies({checkNewCoins: true, ignoreLimit: true}));
      setInterval(
        () => {
          fetchRPCUrl();
        },
        1000 * 60 * 10,
      );
      const walletConnectData = getWalletConnectDetails();
      const onWalletConnectInitError = e =>
        captureError(e, {tags: {area: 'walletconnect', op: 'init'}});
      if (!Object.keys(walletConnectSessions).length) {
        clearWalletConnectStorageCache().then(() => {
          initWalletConnect(walletConnectData).catch(onWalletConnectInitError);
        });
      } else {
        initWalletConnect(walletConnectData).catch(onWalletConnectInitError);
      }
      let hostname = '';
      if (typeof window !== 'undefined') {
        hostname = window?.location?.hostname;
      }
      if (
        allPublicRoutes.includes(pathname) ||
        (publicRoutes.includes(pathname) && masterClickHost.includes(hostname))
      ) {
        setRoutingDone(true);
      } else {
        const lastActiveTime = getLastActiveTime();
        const elapsedMinutesSinceLastActive = lastActiveTime
          ? (Date.now() - lastActiveTime) / (1000 * 60)
          : Infinity;
        const isWithinAutoLockWindow =
          lockTime > 0 && elapsedMinutesSinceLastActive < lockTime;
        const shouldSkipLock =
          typeof window !== 'undefined' &&
          (sessionStorage.getItem('skip_lock_screen') === 'true' ||
            isWithinAutoLockWindow);

        if (!password) {
          if (pathname !== '/auth/registration') {
            routing.replace(searchString ? `/?${searchString}` : '/');
          }
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('skip_lock_screen');
          }
        } else if (!shouldSkipLock) {
          routing.replace(
            searchString ? `/auth/login?${searchString}` : `/auth/login`,
          );
        } else {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('skip_lock_screen');
          }
        }
        setTimeout(() => {
          setRoutingDone(true);
        }, 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReduxStoreLoad]);

  useEffect(() => {
    setWhiteLabelInfo(wlData);
    setWLAppName(wlData?.name);
    // All whitelabels share one Sentry project; the domain was tagged at init,
    // the brand name/id become known here.
    setWhiteLabelContext({
      name: wlData?.name,
      id: wlData?._id,
      host:
        typeof window !== 'undefined' ? window.location.hostname : undefined,
    });
    (async () => {
      try {
        const localeSetCheck = await isLocaleSet();
        if (!localeSetCheck) {
          setUserLocale(wlData.defaultLocale || 'en');
        }
      } catch (e) {
        captureError(e, {tags: {area: 'locale', op: 'set_default'}});
      }
    })();
  }, [wlData]);

  const isKimlWallet = wlData?._id === '65efefca5f95b9f06cc8f9eb';
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}>
      <CaptchaSetup />
      <ThemeProvider
        theme={createDynamicTheme(isKimlWallet ? '#4F8DD8' : '#F44D03')}>
        <div>
          {rountingDone && !disableMessage ? (
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
          theme={themeType === 'light' ? 'light' : 'dark'}
        />
      </ThemeProvider>
    </GoogleReCaptchaProvider>
  );
}

export default AppRouting;
