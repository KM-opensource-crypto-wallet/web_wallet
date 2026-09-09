// Runs in the browser before hydration. Relative import on purpose: Next
// text-scans this file and the alias is not needed here.
import * as Sentry from '@sentry/nextjs';
import './services/logger/sentry.client';

// Navigation breadcrumbs / router instrumentation (no tracing is sampled).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
