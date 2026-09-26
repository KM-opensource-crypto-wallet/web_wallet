// Pure predicates used by beforeSend to drop events that cannot come from
// the app running in a supported browser. Isomorphic: no window, no SDK.
//
// Never drop on missing data: an event without a recognisable browser or
// stack is kept, so a detection gap can only add noise, never hide a defect.

// Oldest version whose parser accepts optional chaining / nullish coalescing.
// The WalletConnect vendor bundle ships both untranspiled, so anything older
// fails at chunk-parse time with a SyntaxError before the app even starts.
// Names are exactly what clientDevice.js emits.
const MIN_BROWSER_VERSION = {
  Chrome: [80, 0],
  Chromium: [80, 0],
  Edge: [80, 0],
  Opera: [67, 0],
  'Samsung Internet': [13, 0],
  Brave: [80, 0],
  Firefox: [74, 0],
  Safari: [13, 1],
};

const parseVersion = version => {
  if (typeof version !== 'string' && typeof version !== 'number') {
    return null;
  }
  const [major, minor = '0'] = String(version).split('.');
  const majorNumber = Number(major);
  const minorNumber = Number(minor);
  if (!Number.isInteger(majorNumber) || Number.isNaN(minorNumber)) {
    return null;
  }
  return [majorNumber, minorNumber];
};

export const isUnsupportedBrowser = event => {
  const browser = event?.contexts?.browser;
  const minimum = MIN_BROWSER_VERSION[browser?.name];
  const version = parseVersion(browser?.version);
  if (!minimum || !version) {
    return false;
  }
  const [major, minor] = version;
  const [minMajor, minMinor] = minimum;
  return major < minMajor || (major === minMajor && minor < minMinor);
};

// Deno runtime internals. Headless scrapers execute the bundle under Deno
// while spoofing a Chrome user-agent; a real browser never has these frames.
const NON_BROWSER_FRAME = /^ext:|(^|\/)01_core\.js$/;
const NON_BROWSER_FUNCTIONS = new Set(['eventLoopTick']);

export const isNonBrowserRuntime = event =>
  (event?.exception?.values || []).some(exception =>
    (exception?.stacktrace?.frames || []).some(
      frame =>
        NON_BROWSER_FRAME.test(frame?.filename || '') ||
        NON_BROWSER_FUNCTIONS.has(frame?.function),
    ),
  );

// Scripts browser extensions inject into the page: extension URL schemes, and
// the wallet-provider `inpage[.bundle].js` (reported as
// `app:///inpage.bundle.js`: two wallet extensions racing to define a
// read-only `window.ethereum`, DOKWALLET-WALLET-WEB-P).
const EXTENSION_FRAME =
  /^(chrome|moz|safari(-web)?|ms-browser)-extension:|(^|\/)inpage(\.bundle)?\.js$/;

// Only when EVERY frame is an extension's: one app frame keeps the event.
export const isExtensionOnlyError = event => {
  const frames = (event?.exception?.values || []).flatMap(
    exception => exception?.stacktrace?.frames || [],
  );
  return (
    frames.length > 0 &&
    frames.every(frame => EXTENSION_FRAME.test(frame?.filename || ''))
  );
};

export const shouldDropEvent = event =>
  isUnsupportedBrowser(event) ||
  isNonBrowserRuntime(event) ||
  isExtensionOnlyError(event);
