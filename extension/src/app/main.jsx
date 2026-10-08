// Entry point of the extension UI (side panel and full tab, same page).
// Order matters: Sentry first (as instrumentation-client.js on the web), then
// the in-page API routes, before any app module runs a request.
import 'services/logger/sentry.client';
import {installApiRoutes} from '@ext/extension/apiRoutes';
import {Buffer} from 'buffer';
import React from 'react';
import {createRoot} from 'react-dom/client';
import '@web-original/src/app/globals.css';
import 'utils/bigNumberConfig';
import './extension.css';
import Root from './Root';

installApiRoutes();
globalThis.Buffer = globalThis.Buffer || Buffer;

const params = new URLSearchParams(window.location.search);
document.documentElement.dataset.surface =
  params.get('surface') === 'sidepanel' ? 'sidepanel' : 'tab';

createRoot(document.getElementById('root')).render(<Root />);
