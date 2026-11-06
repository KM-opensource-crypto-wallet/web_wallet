import React from 'react';
import {renderToString} from 'react-dom/server';
import SupportChat from './index';

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({children}) => <div>{children}</div>,
}));
jest.mock('next-intl', () => ({
  useTranslations: () => key => key,
}));
jest.mock('react-redux', () => ({
  useSelector: () => true,
}));
jest.mock('whitelabel/whiteLabelInfo', () => ({
  DOK_WALLET_ID: 'dok-id',
  getAppIcon: () => '/brand-icon.png',
  getAppIconDark: () => '/brand-icon-dark.png',
  getAppTitle: () => 'Dok Wallet',
  getContactUsEmail: () => 'help@example.com',
  getWhiteLabelId: () => 'dok-id',
}));
jest.mock('./supportChatApi', () => ({
  getStarters: jest.fn(() => new Promise(() => {})),
  send: jest.fn(() => new Promise(() => {})),
  mapResponse: jest.fn(),
}));

describe('SupportChat', () => {
  it('renders the launcher with its aria label and a closed panel', () => {
    const html = renderToString(<SupportChat />);
    expect(html).toContain('aria-label="launcher"');
    expect(html).not.toContain('role="log"');
  });

  it('renders nothing while hidden', () => {
    expect(renderToString(<SupportChat hidden />)).toBe('');
  });
});
