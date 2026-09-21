import {
  createTimedSerialize,
  getPersistTimingSamples,
  getPersistTimingStats,
  resetPersistTimings,
} from 'redux/storage/persistTiming';
import {addBreadcrumb} from 'services/logger';

jest.mock('services/logger', () => ({
  addBreadcrumb: jest.fn(),
  captureError: jest.fn(),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('persistTiming', () => {
  beforeEach(() => {
    resetPersistTimings();
    addBreadcrumb.mockClear();
  });

  it('serializes exactly like JSON.stringify and records a sample', () => {
    const serialize = createTimedSerialize('root');
    const data = {a: 1, b: 'x'};
    expect(serialize(data)).toBe(JSON.stringify(data));
    const [sample] = getPersistTimingSamples();
    expect(sample).toMatchObject({
      label: 'root',
      bytes: JSON.stringify(data).length,
    });
    expect(sample.ms).toBeGreaterThanOrEqual(0);
  });

  it('summarises per label with p50/p95/max and byte sizes', () => {
    const serialize = createTimedSerialize('wallets');
    for (let i = 0; i < 10; i++) {
      serialize({payload: 'x'.repeat(i * 10)});
    }
    createTimedSerialize('auth')({});
    const stats = getPersistTimingStats();
    expect(Object.keys(stats).sort()).toEqual(['auth', 'wallets']);
    expect(stats.wallets.count).toBe(10);
    expect(stats.wallets.maxBytes).toBe(
      JSON.stringify({payload: 'x'.repeat(90)}).length,
    );
    expect(stats.wallets.lastBytes).toBe(stats.wallets.maxBytes);
    expect(stats.wallets.p95Ms).toBeGreaterThanOrEqual(stats.wallets.p50Ms);
    expect(stats.wallets.maxMs).toBeGreaterThanOrEqual(stats.wallets.p95Ms);
  });

  it('only breadcrumbs slow writes', () => {
    const fast = createTimedSerialize('root', {breadcrumbAboveMs: 1000});
    fast({a: 1});
    expect(addBreadcrumb).not.toHaveBeenCalled();
    const always = createTimedSerialize('root', {breadcrumbAboveMs: 0});
    always({a: 1});
    expect(addBreadcrumb).toHaveBeenCalledWith(
      'persist',
      'persist.serialize',
      expect.objectContaining({label: 'root', bytes: 7}),
      'debug',
    );
  });
});
