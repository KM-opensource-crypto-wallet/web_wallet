import * as Sentry from '@sentry/nextjs';
import {onRequestError} from './instrumentation';

// Next's onRequestError arguments as seen in DOKWALLET-WALLET-WEB-1M.
const context = {
  routerKind: 'App Router',
  routePath: '/settings',
  routeType: 'action',
};
const request = () => ({
  method: 'POST',
  path: '/settings/',
  headers: {host: 'app.kimlwallet.com'},
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('onRequestError', () => {
  it('logs a request Next rejected while decoding it instead of opening an issue', () => {
    onRequestError(
      new Error('Referenced Blob is not a Blob.'),
      request(),
      context,
    );

    expect(Sentry.captureRequestError).not.toHaveBeenCalled();
    expect(Sentry.logger.warn).toHaveBeenCalledWith('request.rejected', {
      reason: 'Referenced Blob is not a Blob.',
      method: 'POST',
      route_type: 'action',
      route_path: '/settings',
    });
  });

  it('reports every other request error with its request and context', () => {
    const error = new TypeError(
      "Cannot read properties of undefined (reading 'name')",
    );

    onRequestError(error, request(), context);

    expect(Sentry.captureRequestError).toHaveBeenCalledTimes(1);
    expect(Sentry.captureRequestError).toHaveBeenCalledWith(
      error,
      request(),
      context,
    );
    expect(Sentry.logger.warn).not.toHaveBeenCalled();
  });
});
