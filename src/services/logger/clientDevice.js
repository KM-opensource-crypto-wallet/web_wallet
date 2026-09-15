// Browser and OS detection for Sentry logs and events. Done in the client on
// purpose: letting Sentry infer them from the User-Agent needs
// `dataCollection.userInfo`, which also turns on IP-address collection. This
// keeps `sendDefaultPii: false` and ships only four small attributes, never
// the raw user-agent string.
//
// Client Hints (`navigator.userAgentData`, Chromium) are preferred; the
// user-agent table below covers Safari and Firefox. Unknown parts stay
// undefined, and nothing here throws.

const CHROMIUM_BRANDS = [
  ['Microsoft Edge', 'Edge'],
  ['Opera', 'Opera'],
  ['Samsung Internet', 'Samsung Internet'],
  ['Brave', 'Brave'],
  ['Google Chrome', 'Chrome'],
  ['Chromium', 'Chromium'],
];

// Order matters: Chromium forks advertise "Chrome/" too, and every WebKit
// browser advertises "Safari/".
const UA_BROWSERS = [
  ['Edge', /\bEdg(?:e|A|iOS)?\/(\d+(?:\.\d+)*)/],
  ['Opera', /\bOPR\/(\d+(?:\.\d+)*)/],
  ['Samsung Internet', /\bSamsungBrowser\/(\d+(?:\.\d+)*)/],
  ['Firefox', /\b(?:Firefox|FxiOS)\/(\d+(?:\.\d+)*)/],
  ['Chrome', /\b(?:Chrome|CriOS)\/(\d+(?:\.\d+)*)/],
  ['Safari', /\bVersion\/(\d+(?:\.\d+)*).*\bSafari\//],
];

const UA_OS = [
  ['iOS', /\b(?:iPhone|iPad|iPod).*?\bOS (\d+(?:_\d+)*)/],
  ['Android', /\bAndroid (\d+(?:\.\d+)*)/],
  ['Windows', /\bWindows NT (\d+(?:\.\d+)*)/],
  ['macOS', /\bMac OS X (\d+(?:_\d+)*)/],
  ['Chrome OS', /\bCrOS\b/],
  ['Linux', /\bLinux\b/],
];

const WINDOWS_NT_TO_MARKETING = {'10.0': '10', 6.3: '8.1', 6.2: '8', 6.1: '7'};

const major = version =>
  typeof version === 'string' ? version.split('.')[0] : undefined;

const empty = () => ({
  browser: {name: undefined, version: undefined},
  os: {name: undefined, version: undefined},
});

const browserFromBrands = brands => {
  if (!Array.isArray(brands)) {
    return null;
  }
  for (const [brand, name] of CHROMIUM_BRANDS) {
    const match = brands.find(entry => entry?.brand === brand);
    if (match) {
      return {name, version: match.version};
    }
  }
  return null;
};

const browserFromUserAgent = userAgent => {
  for (const [name, pattern] of UA_BROWSERS) {
    const match = pattern.exec(userAgent);
    if (match) {
      // Safari reports its own marketing version (17.4); Chromium browsers
      // are best identified by their major version.
      return {
        name,
        version: name === 'Safari' ? match[1] : major(match[1]),
      };
    }
  }
  return {name: undefined, version: undefined};
};

const osFromUserAgent = userAgent => {
  for (const [name, pattern] of UA_OS) {
    const match = pattern.exec(userAgent);
    if (match) {
      const raw = match[1]?.replace(/_/g, '.');
      if (name === 'Windows') {
        return {name, version: WINDOWS_NT_TO_MARKETING[raw] || raw};
      }
      return {name, version: raw};
    }
  }
  return {name: undefined, version: undefined};
};

export const describeClientDevice = nav => {
  try {
    const userAgent = typeof nav?.userAgent === 'string' ? nav.userAgent : '';
    const hints = nav?.userAgentData;
    const fromUa = {
      browser: browserFromUserAgent(userAgent),
      os: osFromUserAgent(userAgent),
    };
    const browser = browserFromBrands(hints?.brands) || fromUa.browser;
    // Client Hints only give the platform name; the version needs the async
    // high-entropy call (refineClientDevice), so keep the UA's version.
    const os =
      typeof hints?.platform === 'string' && hints.platform
        ? {name: hints.platform, version: fromUa.os.version}
        : fromUa.os;
    return {browser, os};
  } catch (e) {
    return empty();
  }
};

// Windows reports platformVersion "13.0.0" and above for Windows 11.
const windowsVersion = platformVersion => {
  const value = Number(major(platformVersion));
  if (Number.isNaN(value)) {
    return undefined;
  }
  return value >= 13 ? '11' : '10';
};

export const refineClientDevice = async nav => {
  const hints = nav?.userAgentData;
  if (typeof hints?.getHighEntropyValues !== 'function') {
    return null;
  }
  try {
    const values = await hints.getHighEntropyValues([
      'platformVersion',
      'fullVersionList',
    ]);
    const base = describeClientDevice(nav);
    const full = browserFromBrands(values?.fullVersionList);
    const platformVersion =
      typeof values?.platformVersion === 'string'
        ? values.platformVersion
        : undefined;
    return {
      browser: full || base.browser,
      os: {
        name: base.os.name,
        version:
          base.os.name === 'Windows'
            ? windowsVersion(platformVersion) || base.os.version
            : platformVersion || base.os.version,
      },
    };
  } catch (e) {
    return null;
  }
};

// Sentry conventional attribute keys (see @sentry/conventions).
export const deviceAttributes = device => {
  const out = {};
  const put = (key, value) => {
    if (value !== undefined && value !== null && value !== '') {
      out[key] = String(value);
    }
  };
  put('browser.name', device?.browser?.name);
  put('browser.version', device?.browser?.version);
  put('os.name', device?.os?.name);
  put('os.version', device?.os?.version);
  return out;
};
