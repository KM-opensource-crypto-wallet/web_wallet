import * as Sentry from '@sentry/nextjs';

const FAKE_NAVIGATOR = {
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
};

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('browser Sentry init', () => {
  let options;
  let savedNavigator;

  beforeAll(async () => {
    savedNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      value: FAKE_NAVIGATOR,
      configurable: true,
      writable: true,
    });
    jest.isolateModules(() => {
      require('./sentry.client');
    });
    await flushPromises();
    options = Sentry.init.mock.calls[0][0];
  });

  afterAll(() => {
    if (savedNavigator) {
      Object.defineProperty(globalThis, 'navigator', savedNavigator);
    } else {
      delete globalThis.navigator;
    }
  });

  it('attaches browser and OS to logs and to error contexts', () => {
    expect(Sentry.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'browser.name': 'Safari',
        'browser.version': '17.5',
        'os.name': 'macOS',
        'os.version': '10.15.7',
      }),
    );
    expect(Sentry.setContext).toHaveBeenCalledWith('browser', {
      name: 'Safari',
      version: '17.5',
    });
    expect(Sentry.setContext).toHaveBeenCalledWith('os', {
      name: 'macOS',
      version: '10.15.7',
    });
  });

  it('drops the tracing integrations the Next SDK adds by default', () => {
    const defaults = [
      {name: 'BrowserTracing'},
      {name: 'WebVitals'},
      {name: 'GlobalHandlers'},
      {name: 'Dedupe'},
    ];
    const names = options.integrations(defaults).map(i => i.name);
    expect(names).not.toContain('BrowserTracing');
    expect(names).not.toContain('WebVitals');
    expect(names).toEqual(
      expect.arrayContaining([
        'GlobalHandlers',
        'Dedupe',
        'Breadcrumbs',
        'ConsoleLogs',
      ]),
    );
  });

  it('ships every console level as a Sentry Log and no fetch/xhr breadcrumbs', () => {
    options.integrations([]);
    expect(Sentry.consoleLoggingIntegration).toHaveBeenCalledWith({
      levels: ['log', 'info', 'warn', 'error'],
    });
    expect(Sentry.breadcrumbsIntegration).toHaveBeenCalledWith({
      xhr: false,
      fetch: false,
    });
  });

  it('captures errors and logs only', () => {
    expect(options.tracesSampleRate).toBe(0);
    expect(options.enableLogs).toBe(true);
  });
});
