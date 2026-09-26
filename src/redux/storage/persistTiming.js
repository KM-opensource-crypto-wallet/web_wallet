// Dev-only measurement of redux-persist's serialize step: how many bytes each
// write produces and how long JSON.stringify takes on the JS thread. This is
// the "before" evidence for requirement R9a (spec §7); the same module runs
// unchanged in the web app. Wire it through the persist config's `serialize`
// option and read the numbers with getPersistTimingStats().
import {addBreadcrumb} from 'services/logger';

const MAX_SAMPLES = 500;
const samples = [];

const now = () =>
  typeof globalThis.performance?.now === 'function'
    ? globalThis.performance.now()
    : Date.now();

const record = sample => {
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) {
    samples.shift();
  }
};

/**
 * Returns a redux-persist `serialize` function that records {label, bytes, ms}
 * per call. Breadcrumbs are emitted only for writes above `breadcrumbAboveMs`
 * so a busy dev session does not flood the Sentry ring buffer.
 */
export const createTimedSerialize =
  (label, {breadcrumbAboveMs = 16, stringify = JSON.stringify} = {}) =>
  data => {
    const start = now();
    const out = stringify(data);
    const ms = now() - start;
    const bytes = typeof out === 'string' ? out.length : 0;
    record({label, bytes, ms, at: Date.now()});
    if (ms >= breadcrumbAboveMs) {
      addBreadcrumb(
        'persist',
        'persist.serialize',
        {label, bytes, ms},
        'debug',
      );
    }
    return out;
  };

const percentile = (sorted, p) => {
  if (!sorted.length) {
    return 0;
  }
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, index)];
};

/** Per-label summary of the recorded samples. */
export const getPersistTimingStats = () => {
  const byLabel = {};
  for (const sample of samples) {
    const bucket = (byLabel[sample.label] = byLabel[sample.label] || {
      count: 0,
      ms: [],
      bytes: [],
    });
    bucket.count += 1;
    bucket.ms.push(sample.ms);
    bucket.bytes.push(sample.bytes);
  }
  return Object.fromEntries(
    Object.entries(byLabel).map(([label, bucket]) => {
      const ms = [...bucket.ms].sort((a, b) => a - b);
      const bytes = [...bucket.bytes].sort((a, b) => a - b);
      return [
        label,
        {
          count: bucket.count,
          p50Ms: percentile(ms, 50),
          p95Ms: percentile(ms, 95),
          maxMs: ms[ms.length - 1],
          lastBytes: bucket.bytes[bucket.bytes.length - 1],
          maxBytes: bytes[bytes.length - 1],
        },
      ];
    }),
  );
};

export const getPersistTimingSamples = () => [...samples];

export const resetPersistTimings = () => {
  samples.length = 0;
};
