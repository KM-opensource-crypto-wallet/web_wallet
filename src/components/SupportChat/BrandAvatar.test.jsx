import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeContext} from 'theme/ThemeContext';
import {BrandAvatar, ChatIcon} from './ChatParts';

const mockWl = {id: 'dok-id', light: '/dok-light.png', dark: '/dok-dark.png'};
jest.mock('react-redux', () => ({useSelector: () => true}));
jest.mock('whitelabel/whiteLabelInfo', () => ({
  DOK_WALLET_ID: 'dok-id',
  getAppIcon: () => mockWl.light,
  getAppIconDark: () => mockWl.dark,
  getContactUsEmail: () => '',
  getWhiteLabelId: () => mockWl.id,
}));

const render = (themeType = 'light') =>
  renderToString(
    <ThemeContext.Provider value={{themeType}}>
      <BrandAvatar />
    </ThemeContext.Provider>,
  );

describe('BrandAvatar', () => {
  afterEach(() => {
    Object.assign(mockWl, {
      id: 'dok-id',
      light: '/dok-light.png',
      dark: '/dok-dark.png',
    });
  });

  it('uses the white label icon for the current theme', () => {
    expect(render('light')).toContain('src="/dok-light.png"');
    expect(render('dark')).toContain('src="/dok-dark.png"');
  });

  it('uses the brand icon for other white labels too', () => {
    Object.assign(mockWl, {
      id: 'kiml-id',
      light: '/kiml.png',
      dark: '/kiml.png',
    });
    expect(render()).toContain('src="/kiml.png"');
  });

  it('never shows the Dok fallback icon for another brand', () => {
    Object.assign(mockWl, {
      id: 'kiml-id',
      light: '/dokwallet.ico',
      dark: '/dokwallet.ico',
    });
    const html = render();
    expect(html).not.toContain('dokwallet.ico');
    expect(html).toContain('support-chat-glyph.png');
  });

  it('falls back to the coloured chat icon when the brand has no icon', () => {
    Object.assign(mockWl, {id: 'kiml-id', light: undefined, dark: undefined});
    expect(render()).toContain('support-chat-glyph.png');
  });
});

describe('ChatIcon', () => {
  it('has no brand-specific image, only the neutral glyph', () => {
    const html = renderToString(<ChatIcon />);
    expect(html).toContain('/images/support-chat-glyph.png');
    expect(html).toContain('aria-hidden="true"');
  });
});
