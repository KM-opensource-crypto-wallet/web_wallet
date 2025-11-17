import {sha256} from 'js-sha256';

export async function generateSHA256ForCoins(coins, isEVMChain) {
  const coinData = Array.isArray(coins) ? coins : [];
  if (coinData.length) {
    let coinNames = [];
    for (let i = 0; i < coinData.length; i++) {
      const item = coinData[i];
      const str = `${isEVMChain(item?.chain_name) ? 'ETH' : item.chain_symbol}:${
        item.address
      }`;
      if (item?.type === 'coin' && !coinNames.includes(str)) {
        coinNames.push(str);
      }
    }
    return Promise.all(coinNames.map(item => sha256(item)));
  }
  return [];
}

export const APP_VERSION = process.env.APP_VERSION;

export function randomNumber(min, max) {
  if (typeof window !== 'undefined') {
    const byteArray = new Uint8Array(1);
    window && window.crypto.getRandomValues(byteArray);
    const range = max - min + 1;
    const max_range = 256;
    if (byteArray[0] >= Math.floor(max_range / range) * range) {
      return randomNumber(min, max);
    }
    return min + (byteArray[0] % range);
  }
  return '0';
}

function getQueryParams(urlString) {
  // Create a URL object
  const url = new URL(urlString);

  // Retrieve the URLSearchParams object
  const searchParams = url.searchParams;

  // Build a standard JS object from the parameters
  const paramsObj = {};
  for (const [key, value] of searchParams.entries()) {
    paramsObj[key] = value;
  }
  return paramsObj;
}

export const popupCenter = async ({url, title, callback}) => {
  if (window) {
    const dualScreenLeft =
      window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop =
      window.screenTop !== undefined ? window.screenTop : window.screenY;

    const width = window.innerWidth
      ? window.innerWidth
      : document.documentElement.clientWidth
        ? document.documentElement.clientWidth
        : screen.width;
    const height = window.innerHeight
      ? window.innerHeight
      : document.documentElement.clientHeight
        ? document.documentElement.clientHeight
        : screen.height;

    const systemZoom = width / window.screen.availWidth;
    const w = width * 0.8;
    const h = height * 0.9;
    const left = (width - w) / 2 / systemZoom + dualScreenLeft;
    const top = (height - h) / 2 / systemZoom + dualScreenTop;
    const newWindow = window.open(
      url,
      title,
      `
      noopener,
      scrollbars=yes,
      width=${w / systemZoom}, 
      height=${h / systemZoom}, 
      top=${top}, 
      left=${left}
      `,
    );

    if (newWindow) {
      try {
        newWindow.opener = null;
      } catch {}
    }

    if (callback == null || typeof callback !== 'function') {
      return;
    }

    const POLL_INTERVAL = 1000;
    let isCleanedUp = false;

    let intervalId = setInterval(() => {
      if (newWindow.closed || isCleanedUp) {
        clearInterval(intervalId);
        callback(false);
        return;
      }

      try {
        if (
          newWindow?.location?.href != null &&
          newWindow?.location?.href.includes('send-funds')
        ) {
          newWindow.close();
          clearInterval(intervalId);
          if (newWindow?.location?.href.includes('transactionId')) {
            const params = getQueryParams(newWindow?.location?.href);
            callback(true, params);
          } else {
            callback(true);
          }
        }
      } catch (e) {
        //Ignore expected cross-origin errors
        if (!(e instanceof DOMException)) {
          console.error(e);
        }
      }
    }, POLL_INTERVAL);

    return () => {
      isCleanedUp = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (newWindow && !newWindow.closed) {
        newWindow.close();
      }
    };
  }
};

export function cryptoRandom() {
  if (typeof window !== 'undefined') {
    return window.crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
  }
  return '0';
}

const getBrowserDetails = () => {
  try {
    let userAgent = navigator.userAgent;
    let browserName = navigator.appName;
    let fullVersion = '' + parseFloat(navigator.appVersion);
    let majorVersion = parseInt(navigator.appVersion, 10);
    let nameOffset, verOffset, ix;

    // In Opera, the true version is after "Opera" or after "Version"
    if ((verOffset = userAgent.indexOf('Opera')) !== -1) {
      browserName = 'Opera';
      fullVersion = userAgent.substring(verOffset + 6);
      if ((verOffset = userAgent.indexOf('Version')) !== -1)
        fullVersion = userAgent.substring(verOffset + 8);
    }
    // In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset = userAgent.indexOf('MSIE')) !== -1) {
      browserName = 'Microsoft Internet Explorer';
      fullVersion = userAgent.substring(verOffset + 5);
    }
    // In Chrome, the true version is after "Chrome"
    else if ((verOffset = userAgent.indexOf('Chrome')) !== -1) {
      browserName = 'Chrome';
      fullVersion = userAgent.substring(verOffset + 7);
    }
    // In Safari, the true version is after "Safari" or after "Version"
    else if ((verOffset = userAgent.indexOf('Safari')) !== -1) {
      browserName = 'Safari';
      fullVersion = userAgent.substring(verOffset + 7);
      if ((verOffset = userAgent.indexOf('Version')) !== -1)
        fullVersion = userAgent.substring(verOffset + 8);
    }
    // In Firefox, the true version is after "Firefox"
    else if ((verOffset = userAgent.indexOf('Firefox')) !== -1) {
      browserName = 'Firefox';
      fullVersion = userAgent.substring(verOffset + 8);
    }
    // In most other browsers, "name/version" is at the end of userAgent
    else if (
      (nameOffset = userAgent.lastIndexOf(' ') + 1) <
      (verOffset = userAgent.lastIndexOf('/'))
    ) {
      browserName = userAgent.substring(nameOffset, verOffset);
      fullVersion = userAgent.substring(verOffset + 1);
      if (browserName.toLowerCase() === browserName.toUpperCase()) {
        browserName = navigator.appName;
      }
    }
    // trim the fullVersion string at semicolon/space if present
    if ((ix = fullVersion.indexOf(';')) !== -1)
      fullVersion = fullVersion.substring(0, ix);
    if ((ix = fullVersion.indexOf(' ')) !== -1)
      fullVersion = fullVersion.substring(0, ix);

    majorVersion = parseInt('' + fullVersion, 10);
    if (isNaN(majorVersion)) {
      fullVersion = '' + parseFloat(navigator.appVersion);
      majorVersion = parseInt(navigator.appVersion, 10);
    }
    return `${browserName}_${fullVersion}`;
  } catch (e) {
    return null;
  }
};

export const isValidBrowser = () => {
  try {
    const browserDetails = getBrowserDetails();
    console.log('browser details', browserDetails);
    if (browserDetails?.toLowerCase()?.includes('safari')) {
      const version = browserDetails?.split('_')[1];
      return Number(version) > 16.4;
    }
    return true;
  } catch (e) {
    return true;
  }
};
export const arrayToCsv = data => {
  const headers = Object.keys(data[0]);
  const rows = data.map(row => Object.values(row).join(','));
  return [headers.join(','), ...rows].join('\n');
};

// Function to trigger CSV download
export const downloadCsv = arrayData => {
  const csvData = arrayToCsv(arrayData);
  const blob = new Blob([csvData], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'data.csv'); // File name for download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const allPublicRoutes = ['/auth/learn-reset/'];

export const publicRoutes = [
  '/masterclick-privacy-policy/',
  '/masterclick-terms-conditions/',
  '/masterclick-privacy-policy',
  '/masterclick-terms-conditions',
];

export const masterClickHost = [
  'wallet_master_click',
  'wallet.masterclick.ltd',
  'www.wallet.masterclick.ltd',
];

export const Constants = {
  lastAttempt: {
    title: 'Last Attempt',
    subTitle:
      'You have one more attempt if you type a wrong password again your wallet will delete completely.',
  },
};
