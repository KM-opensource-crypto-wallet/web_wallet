// `services/logger` is imported by the shared redux slices and by utilities
// under test. The Sentry SDK expects a browser or Node runtime that jest does
// not provide, so stub the surface the facade uses. Tests that need to assert
// on SDK calls import `* as Sentry from '@sentry/nextjs'` and read the mocks.
jest.mock('@sentry/nextjs', () => {
  const scope = () => ({
    setLevel: jest.fn(),
    setTag: jest.fn(),
    setTags: jest.fn(),
    setExtras: jest.fn(),
    setUser: jest.fn(),
  });
  return {
    init: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    captureRequestError: jest.fn(),
    captureRouterTransitionStart: jest.fn(),
    addBreadcrumb: jest.fn(),
    setUser: jest.fn(),
    setTag: jest.fn(),
    setTags: jest.fn(),
    setAttribute: jest.fn(),
    setAttributes: jest.fn(),
    setExtras: jest.fn(),
    setContext: jest.fn(),
    withScope: jest.fn(callback => callback(scope())),
    getCurrentScope: jest.fn(scope),
    getIsolationScope: jest.fn(scope),
    breadcrumbsIntegration: jest.fn(() => ({name: 'Breadcrumbs'})),
    consoleLoggingIntegration: jest.fn(() => ({name: 'ConsoleLogs'})),
    logger: {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      fmt: jest.fn((strings, ...values) =>
        String.raw({raw: strings}, ...values),
      ),
    },
  };
});
