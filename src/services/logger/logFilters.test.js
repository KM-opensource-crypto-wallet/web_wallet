import {
  captureCallerStack,
  isForeignLog,
  originatingScriptUrl,
} from './logFilters';

// The top frames are the SDK's own (beforeSendLog, captureLog, the console
// wrapper); the last line is where the call that logged began.
const CHROME_FROM_EXTENSION = `Error
    at captureCallerStack (app:///_next/static/chunks/1123-64ad92f036d8524c.js:1:2000)
    at beforeSendLog (app:///_next/static/chunks/1123-64ad92f036d8524c.js:1:3000)
    at console.log (app:///_next/static/chunks/1123-64ad92f036d8524c.js:1:4000)
    at scan (chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/inject.js:12:5)
    at chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/inject.js:40:3`;

const CHROME_APP_THROUGH_EXTENSION_WRAPPER = `Error
    at beforeSendLog (app:///_next/static/chunks/1123-64ad92f036d8524c.js:1:3000)
    at console.log (app:///_next/static/chunks/1123-64ad92f036d8524c.js:1:4000)
    at console.log (chrome-extension://fmkadmapgofadopljbjfkapdkoienihi/installHook.js:1:9000)
    at onPress (https://app.dokwallet.com/_next/static/chunks/app/settings/page-1.js:1:500)
    at HTMLButtonElement.callCallback (https://app.dokwallet.com/_next/static/chunks/4bd1b696-04d4e6726f46d1d5.js:1:191448)`;

const FIREFOX_FROM_EXTENSION = `beforeSendLog@app:///_next/static/chunks/1123-64ad92f036d8524c.js:1:3000
log@app:///_next/static/chunks/1123-64ad92f036d8524c.js:1:4000
detect@moz-extension://0b5f1c2e-1111-2222-3333-444455556666/content/page.js:7:11
@moz-extension://0b5f1c2e-1111-2222-3333-444455556666/content/page.js:90:1`;

const SAFARI_FROM_EXTENSION = `beforeSendLog@app:///_next/static/chunks/1123-64ad92f036d8524c.js:1:3000
log@app:///_next/static/chunks/1123-64ad92f036d8524c.js:1:4000
@safari-web-extension://8F1D2C3B-AAAA-BBBB-CCCC-DDDDEEEEFFFF/inject.js:3:9`;

describe('originatingScriptUrl', () => {
  it('returns the outermost frame URL for V8, Firefox and Safari stacks', () => {
    expect(originatingScriptUrl(CHROME_FROM_EXTENSION)).toBe(
      'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/inject.js',
    );
    expect(originatingScriptUrl(FIREFOX_FROM_EXTENSION)).toBe(
      'moz-extension://0b5f1c2e-1111-2222-3333-444455556666/content/page.js',
    );
    expect(originatingScriptUrl(SAFARI_FROM_EXTENSION)).toBe(
      'safari-web-extension://8F1D2C3B-AAAA-BBBB-CCCC-DDDDEEEEFFFF/inject.js',
    );
  });

  it('skips trailing frames without a URL', () => {
    expect(
      originatingScriptUrl(
        `${CHROME_FROM_EXTENSION}\n    at Array.forEach (<anonymous>)\n    at node:internal/timers:1:1`,
      ),
    ).toBe('chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/inject.js');
  });

  it('returns null when nothing can be read', () => {
    expect(originatingScriptUrl(undefined)).toBeNull();
    expect(originatingScriptUrl('')).toBeNull();
    expect(originatingScriptUrl('Error\n    at <anonymous>')).toBeNull();
  });
});

describe('isForeignLog', () => {
  it('flags logs whose call started in an extension script', () => {
    expect(isForeignLog('all links count 0', CHROME_FROM_EXTENSION)).toBe(true);
    expect(isForeignLog('x', FIREFOX_FROM_EXTENSION)).toBe(true);
    expect(isForeignLog('x', SAFARI_FROM_EXTENSION)).toBe(true);
  });

  it('keeps app logs even when an extension wraps console mid-stack', () => {
    expect(
      isForeignLog('browser details', CHROME_APP_THROUGH_EXTENSION_WRAPPER),
    ).toBe(false);
  });

  it('flags known injected messages without a stack', () => {
    expect(isForeignLog('FBNavFirstContentfulPaint:1790610918630', null)).toBe(
      true,
    );
    expect(isForeignLog('FBNavLargestContentfulPaint:1790610924386')).toBe(
      true,
    );
    expect(
      isForeignLog(
        '%c[ResourceDetector] color: #0066cc; font-weight: normal; all links count 0',
      ),
    ).toBe(true);
  });

  it('keeps app messages and logs it cannot place', () => {
    expect(isForeignLog('dokapi.failed', null)).toBe(false);
    expect(isForeignLog('browser details Safari_27.0', '')).toBe(false);
    expect(isForeignLog('page FBNav timing 12', null)).toBe(false);
  });
});

describe('captureCallerStack', () => {
  it('returns a stack and restores the V8 frame limit', () => {
    const before = Error.stackTraceLimit;
    expect(typeof captureCallerStack()).toBe('string');
    expect(Error.stackTraceLimit).toBe(before);
  });
});
