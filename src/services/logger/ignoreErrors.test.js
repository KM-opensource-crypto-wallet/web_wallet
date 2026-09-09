import {HEDERA_KEY_MISMATCH_MESSAGE} from 'dok-wallet-blockchain-networks/helper';
import {ignoreErrors} from './ignoreErrors';

const matches = message =>
  ignoreErrors.some(pattern =>
    pattern instanceof RegExp ? pattern.test(message) : pattern === message,
  );

describe('ignoreErrors', () => {
  it('keeps the duplicated Hedera message in sync with the helper', () => {
    // The helper is not imported by ignoreErrors.js on purpose: it drags the
    // chain configs into the pre-hydration client bundle. This test is the
    // guard against the two strings drifting apart.
    expect(ignoreErrors).toContain(HEDERA_KEY_MISMATCH_MESSAGE);
  });

  it('ignores connectivity failures', () => {
    expect(matches('Network Error')).toBe(true);
    expect(matches('timeout of 30000ms exceeded')).toBe(true);
    expect(matches('Request failed with status code 502')).toBe(true);
  });

  it('ignores browser chunk-loading and layout noise', () => {
    expect(matches('Loading chunk 123 failed.')).toBe(true);
    expect(
      matches('ResizeObserver loop completed with undelivered notifications.'),
    ).toBe(true);
    expect(matches('Failed to fetch dynamically imported module: /x.js')).toBe(
      true,
    );
  });

  it('does not ignore ordinary defects', () => {
    expect(
      matches("Cannot read properties of undefined (reading 'chain_name')"),
    ).toBe(false);
  });
});
