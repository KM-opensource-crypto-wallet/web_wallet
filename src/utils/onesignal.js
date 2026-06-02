import OneSignal from 'react-onesignal';

let _initialized = false;
let _appId = '';

/**
 * Called once from AppRouting when white-label data loads.
 * Stores the app ID for later use — does NOT call OneSignal.init() or show
 * any prompts. Init is deferred until the user explicitly enables notifications.
 */
export const setOneSignalAppId = appId => {
  if (appId) _appId = appId;
};

/**
 * Initializes OneSignal (once), logs in the device, opts in to push,
 * and returns the onesignalId. Call only when the user explicitly
 * grants/enables notifications.
 */
export const initOneSignal = async () => {
  if (!_appId) return null;
  try {
    if (!_initialized) {
      await OneSignal.init({
        appId: _appId,
        allowLocalhostAsSecureOrigin: true,
        promptOptions: {
          slidedown: {enabled: false},
        },
      });
      _initialized = true;
    }

    const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);

    await OneSignal.login(deviceId);
    await OneSignal.User.PushSubscription.optIn();

    // onesignalId is populated asynchronously after server-side registration.
    // Poll for up to 5 seconds before giving up.
    let osId = null;
    for (let i = 0; i < 10 && !osId; i++) {
      osId = OneSignal.User.onesignalId;
      if (!osId) await new Promise(r => setTimeout(r, 500));
    }

    return osId || null;
  } catch (error) {
    console.error('OneSignal init error:', error);
    return null;
  }
};

export const logoutOneSignal = () => {
  OneSignal.logout();
};
