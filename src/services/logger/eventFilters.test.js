import {
  isNonBrowserRuntime,
  isUnsupportedBrowser,
  shouldDropEvent,
} from './eventFilters';

const withBrowser = (name, version) => ({contexts: {browser: {name, version}}});
const withFrames = frames => ({
  exception: {values: [{type: 'TypeError', stacktrace: {frames}}]},
});

describe('isUnsupportedBrowser', () => {
  it('drops browsers older than the optional-chaining baseline', () => {
    expect(isUnsupportedBrowser(withBrowser('Chrome', '79'))).toBe(true);
    expect(isUnsupportedBrowser(withBrowser('Edge', '79.0.309.71'))).toBe(true);
    expect(isUnsupportedBrowser(withBrowser('Firefox', '73'))).toBe(true);
    expect(isUnsupportedBrowser(withBrowser('Safari', '13.0'))).toBe(true);
    expect(isUnsupportedBrowser(withBrowser('Safari', '12.1.2'))).toBe(true);
  });

  it('keeps the baseline and everything newer', () => {
    expect(isUnsupportedBrowser(withBrowser('Chrome', '80'))).toBe(false);
    expect(isUnsupportedBrowser(withBrowser('Chrome', '153.0.8010.36'))).toBe(
      false,
    );
    expect(isUnsupportedBrowser(withBrowser('Safari', '13.1'))).toBe(false);
    expect(isUnsupportedBrowser(withBrowser('Safari', '17.4'))).toBe(false);
    expect(isUnsupportedBrowser(withBrowser('Firefox', '74'))).toBe(false);
  });

  it('never drops on missing or unparsable data', () => {
    expect(isUnsupportedBrowser({})).toBe(false);
    expect(isUnsupportedBrowser(withBrowser(undefined, undefined))).toBe(false);
    expect(isUnsupportedBrowser(withBrowser('Chrome', undefined))).toBe(false);
    expect(isUnsupportedBrowser(withBrowser('Chrome', 'unknown'))).toBe(false);
    expect(isUnsupportedBrowser(withBrowser('SomeBrowser', '1'))).toBe(false);
  });
});

describe('isNonBrowserRuntime', () => {
  it('drops events with Deno runtime frames', () => {
    expect(
      isNonBrowserRuntime(
        withFrames([
          {filename: '<script>', function: 'el'},
          {filename: 'ext:core/01_core.js', function: 'eventLoopTick'},
        ]),
      ),
    ).toBe(true);
    expect(
      isNonBrowserRuntime(
        withFrames([{filename: '01_core.js', function: '?'}]),
      ),
    ).toBe(true);
    expect(
      isNonBrowserRuntime(
        withFrames([{filename: 'https://x/app.js', function: 'eventLoopTick'}]),
      ),
    ).toBe(true);
  });

  it('keeps ordinary browser stacks and events without a stack', () => {
    expect(
      isNonBrowserRuntime(
        withFrames([
          {
            filename: 'https://app.dokwallet.com/_next/static/chunks/2736.js',
            function: 'o.r',
          },
        ]),
      ),
    ).toBe(false);
    expect(isNonBrowserRuntime({message: 'plain'})).toBe(false);
    expect(isNonBrowserRuntime(undefined)).toBe(false);
  });
});

describe('shouldDropEvent', () => {
  it('combines both predicates', () => {
    expect(shouldDropEvent(withBrowser('Chrome', '79'))).toBe(true);
    expect(
      shouldDropEvent(withFrames([{filename: 'ext:deno_web/02_event.js'}])),
    ).toBe(true);
    expect(shouldDropEvent(withBrowser('Chrome', '120'))).toBe(false);
  });
});
