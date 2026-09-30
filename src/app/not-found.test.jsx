/**
 * Next renders not-found for an unhandled form Server Action WITHOUT the root
 * layout, so no redux Provider is mounted (Sentry: "Cannot destructure
 * property 'store' of ... as it is null").
 */
import React from 'react';
import {renderToString} from 'react-dom/server';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import NotFound from './not-found';

jest.mock('components/LegacyRouteRedirect', () => ({
  __esModule: true,
  default: () => <span>legacy-redirect</span>,
}));

describe('root not-found page', () => {
  it('renders a plain 404 when no redux store is in context', () => {
    const html = renderToString(<NotFound />);
    expect(html).toContain('Page not found');
    expect(html).not.toContain('legacy-redirect');
  });

  it('forwards through LegacyRouteRedirect inside the Provider', () => {
    const store = configureStore({reducer: () => ({})});
    const html = renderToString(
      <Provider store={store}>
        <NotFound />
      </Provider>,
    );
    expect(html).toContain('legacy-redirect');
    expect(html).not.toContain('Page not found');
  });
});
