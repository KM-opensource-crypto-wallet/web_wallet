// Edge runtime Sentry init. No middleware or edge routes exist today, so this
// only has to be present for instrumation.js to register it.
import * as Sentry from '@sentry/nextjs';
import {baseOptions} from './sentryOptions';

Sentry.init(baseOptions());
