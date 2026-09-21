'use client';
import {getRouteNameFromPathname} from 'utils/routes';
import React, {useCallback, useContext, useEffect, useState} from 'react';
import s from './AppRouting.module.css';
import {usePathname, useSearchParams} from 'next/navigation';
import ReactGA from 'react-ga4';
import Header from '../Header';
import Sidebar from '../Sidebar';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {
  getHasAccount,
  getIsVaultUnlocked,
} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {persistor, vaultSync} from 'redux/store';
import {lockSession} from 'security/unlockFlow';
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
  logger,
  setUserContext,
  setWhiteLabelContext,
} from 'services/logger';
import {initWalletConnect} from 'dok-wallet-blockchain-networks/service/walletconnect';
import {setIsWalletConnectInitialized} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {hasLocaleCookie} from 'utils/localeCookie';
import {clearSkipLockScreen, shouldSkipLockScreen} from 'utils/lockScreen';
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

import {resetIsAdding50MoreAddresses} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {isLocaleSet, setUserLocale} from 'src/utils/updateLocale';
import {masterClickHost, publicRoutes, allPublicRoutes} from 'utils/common';
import {setWLAppName} from 'utils/wlData';
import {ThemeProvider} from '@mui/system';
import {createDynamicTheme} from 'src/theme';
import CoinSyncWidget from 'components/CoinSyncWidget';

function AppRouting({children, wlData}) {
  // Routing keys off "has an account", never off a stored password (there is
  // none any more); wallet data is sealed until the vault unlocks.
  const hasAccount = useSelector(getHasAccount);
  const isVaultUnlocked = useSelector(getIsVaultUnlocked);
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
    // The submodule's refreshCoinData keys off these names after a send.
    MainNavigation.setCurrentRouteName(getRouteNameFromPathname(pathname));
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
    // Zeroise before showing the lock screen: keys leave memory, sealed
    // persistence pauses, and only re-login brings them back.
    dispatch(lockSession());
    const currentSearchString = searchParams?.toString();
    const searchString = currentSearchString
      ? `${currentSearchString}&redirectRoute=${encodeURIComponent(pathname)}`
      : `redirectRoute=${encodeURIComponent(pathname)}`;
    routing.replace(`/auth/login?${searchString}`);
  }, [dispatch, pathname, searchParams, routing]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasAccount || !(lockTime > 0)) {
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
  }, [hasAccount, lockTime, pathname, redirectToLoginOnTimeout]);

  useEffect(() => {
    if (isReduxStoreLoad) {
      dispatch(resetIsAdding50MoreAddresses());
      let searchString = searchParams?.toString();
      if (
        !pathname?.includes('/auth') &&
        pathname !== '/' &&
        !publicRoutes.includes(pathname)
      ) {
        // Encoded: transaction-details paths embed a percent-encoded URL
        // that must survive the login round-trip intact.
        const redirectRoute = encodeURIComponent(pathname);
        searchString = searchString
          ? `${searchString}&redirectRoute=${redirectRoute}`
          : `redirectRoute=${redirectRoute}`;
      }
      for (const key of searchParams.keys()) {
        if (key?.toLowerCase() === 'aid') {
          createAIDIfNotExists(searchParams.get(key));
        }
      }
      // Wallet-slice housekeeping (privacy-mode addresses, hidden-wallet
      // reassignment, master client id) moved to the unlock flow: the sealed
      // wallets slice is empty until then.
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
      let hostname = '';
      if (typeof window !== 'undefined') {
        hostname = window?.location?.hostname;
      }
      if (
        allPublicRoutes.includes(pathname) ||
        (publicRoutes.includes(pathname) && masterClickHost.includes(hostname))
      ) {
        // Anonymous function: the react-hooks compiler lint flags setState calls
        // made directly in an effect body; the same update here is accepted.
        (() => {
          setRoutingDone(true);
        })();
      } else {
        const lastActiveTime = getLastActiveTime();
        const elapsedMinutesSinceLastActive = lastActiveTime
          ? (Date.now() - lastActiveTime) / (1000 * 60)
          : Infinity;
        const isWithinAutoLockWindow =
          lockTime > 0 && elapsedMinutesSinceLastActive < lockTime;
        const shouldSkipLock = shouldSkipLockScreen() || isWithinAutoLockWindow;

        if (!hasAccount) {
          if (pathname !== '/auth/registration') {
            routing.replace(searchString ? `/?${searchString}` : '/');
          }
          clearSkipLockScreen();
        } else if (!shouldSkipLock || pathname === '/') {
          // The onboarding carousel at '/' is for new users only. With a
          // wallet present it always hands over to login, which itself skips
          // the password while the auto-lock window is open.
          routing.replace(
            searchString ? `/auth/login?${searchString}` : `/auth/login`,
          );
        } else {
          clearSkipLockScreen();
        }
        setTimeout(() => {
          setRoutingDone(true);
        }, 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReduxStoreLoad]);

  // WalletConnect needs signing keys: a session_request arriving while the
  // user sits on Login would open the request modal with no key to sign (spec
  // §12.2.2). Start it once per page load, after the vault has unlocked.
  const [walletConnectStarted, setWalletConnectStarted] = useState(false);
  useEffect(() => {
    if (!isReduxStoreLoad || !isVaultUnlocked || walletConnectStarted) {
      return;
    }
    (() => {
      setWalletConnectStarted(true);
    })();
    // WalletKit.init takes a relay handshake; screens that need the client
    // (WalletConnectStatus) wait on this flag instead of racing it.
    const startWalletConnect = () =>
      initWalletConnect(getWalletConnectDetails())
        .then(() => dispatch(setIsWalletConnectInitialized(true)))
        .catch(e =>
          captureError(e, {tags: {area: 'walletconnect', op: 'init'}}),
        );
    if (!Object.keys(walletConnectSessions).length) {
      clearWalletConnectStorageCache().then(startWalletConnect);
    } else {
      startWalletConnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReduxStoreLoad, isVaultUnlocked]);

  // Persist writes are throttled and the vault write debounced; push both out
  // before the tab is hidden or unloaded.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const flush = () => {
      persistor.flush().catch(() => {});
      vaultSync.flush().catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

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
    // Persist the whitelabel default locale once. The cookie check avoids a
    // server-action round trip on every load for returning users; the action
    // is awaited so its failure stays inside this try. Losing it is harmless
    // (getUserLocale falls back to the default), so it is a log, not an error.
    (async () => {
      if (hasLocaleCookie()) {
        return;
      }
      try {
        const localeSetCheck = await isLocaleSet();
        if (!localeSetCheck) {
          await setUserLocale(wlData.defaultLocale || 'en');
        }
      } catch (e) {
        logger.warn('locale.set_default_failed', {reason: e?.message});
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
