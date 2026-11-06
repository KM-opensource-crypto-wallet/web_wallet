jest.mock('whitelabel/whiteLabelInfo', () => ({
  DOK_WALLET_ID: 'dok-id',
  getAppIcon: () => '/brand-icon.png',
  getAppIconDark: () => '/brand-icon-dark.png',
}));

import {
  getContactOptions,
  getRoutePattern,
  isAllowedHref,
  isSupportChatHidden,
  MARKDOWN_PROPS,
  SUPPORT_CHAT_HIDDEN_ROUTES,
} from './policy';

describe('isSupportChatHidden', () => {
  it.each(SUPPORT_CHAT_HIDDEN_ROUTES)('hides %s in every form', route => {
    expect(isSupportChatHidden(route)).toBe(true);
    expect(isSupportChatHidden(`${route}/`)).toBe(true);
    expect(isSupportChatHidden(`/wallet/abc123${route}`)).toBe(true);
    expect(isSupportChatHidden(`/wallet/abc123${route}/`)).toBe(true);
    expect(isSupportChatHidden(`${route}/sub/page`)).toBe(true);
  });

  it('covers every /verify screen', () => {
    for (const s of [
      'verify-create',
      'verify-screen',
      'verify-login',
      'verify-learn',
    ]) {
      expect(isSupportChatHidden(`/verify/${s}`)).toBe(true);
    }
  });

  it.each([
    '/auth/login',
    '/auth/registration',
    '/auth/create-wallet',
    '/auth/reset-wallet',
    '/wallets/create-wallet',
    '/wallet/abc/home',
    '/settings',
    '/verifyx',
    '/settings/change-password-x',
    '/',
  ])('shows %s', path => {
    expect(isSupportChatHidden(path)).toBe(false);
  });

  it('handles a missing pathname', () => {
    expect(isSupportChatHidden(undefined)).toBe(false);
    expect(isSupportChatHidden(null)).toBe(false);
  });
});

describe('isAllowedHref', () => {
  const hosts = ['t.me', 'dokwallet.com', 'www.dokwallet.com'];

  it('allows app routes', () => {
    expect(isAllowedHref('/contact-us', hosts)).toBe(true);
    expect(isAllowedHref('/wallet/abc/home?x=1#y', [])).toBe(true);
  });

  it('allows https hosts in linkHosts, including www and case differences', () => {
    expect(isAllowedHref('https://t.me/dokwallet', hosts)).toBe(true);
    expect(isAllowedHref('https://www.dokwallet.com/help', hosts)).toBe(true);
    expect(isAllowedHref('https://T.ME/x', hosts)).toBe(true);
  });

  it('rejects hosts not in the list and lookalikes', () => {
    expect(isAllowedHref('https://evil.com', hosts)).toBe(false);
    expect(isAllowedHref('https://t.me.evil.com', hosts)).toBe(false);
    expect(isAllowedHref('https://www.t.me', hosts)).toBe(false);
    expect(isAllowedHref('https://t.me@evil.com/', hosts)).toBe(false);
  });

  it('rejects protocol-relative, backslash and control-character forms', () => {
    expect(isAllowedHref('//evil.com', hosts)).toBe(false);
    expect(isAllowedHref('/\t/evil.com', hosts)).toBe(false);
    expect(isAllowedHref('/\\evil.com', hosts)).toBe(false);
    expect(isAllowedHref('/\n/evil.com', hosts)).toBe(false);
    expect(isAllowedHref('/a b', hosts)).toBe(false);
    expect(isAllowedHref('/\u0000x', hosts)).toBe(false);
    expect(isAllowedHref('https://t.me/a b', hosts)).toBe(false);
  });

  it('rejects other schemes', () => {
    expect(isAllowedHref('javascript:alert(1)', hosts)).toBe(false);
    expect(isAllowedHref('http://t.me/x', hosts)).toBe(false);
    expect(isAllowedHref('mailto:a@b.com', hosts)).toBe(false);
    expect(isAllowedHref('data:text/html,x', hosts)).toBe(false);
    expect(isAllowedHref('t.me/x', hosts)).toBe(false);
  });

  it('rejects everything external when linkHosts is empty or missing', () => {
    expect(isAllowedHref('https://t.me/x', [])).toBe(false);
    expect(isAllowedHref('https://t.me/x', undefined)).toBe(false);
  });

  it('rejects empty and non-string hrefs', () => {
    expect(isAllowedHref('', hosts)).toBe(false);
    expect(isAllowedHref(undefined, hosts)).toBe(false);
    expect(isAllowedHref(null, hosts)).toBe(false);
    expect(isAllowedHref('https://', hosts)).toBe(false);
  });
});

describe('getContactOptions', () => {
  it('returns email, telegram (Dok only) and contact us (unlocked only), in order', () => {
    expect(
      getContactOptions({
        email: 'a@b.com',
        whiteLabelId: 'dok-id',
        unlocked: true,
      }),
    ).toEqual([
      {type: 'email', href: 'mailto:a@b.com'},
      {type: 'telegram', href: 'https://t.me/dokwallet'},
      {type: 'contactUs', href: '/contact-us'},
    ]);
  });

  it('omits what does not apply', () => {
    expect(
      getContactOptions({
        email: 'a@b.com',
        whiteLabelId: 'other',
        unlocked: false,
      }),
    ).toEqual([{type: 'email', href: 'mailto:a@b.com'}]);
    expect(
      getContactOptions({email: '', whiteLabelId: 'other', unlocked: false}),
    ).toEqual([]);
    expect(
      getContactOptions({
        email: undefined,
        whiteLabelId: 'dok-id',
        unlocked: false,
      }),
    ).toEqual([{type: 'telegram', href: 'https://t.me/dokwallet'}]);
  });
});

describe('MARKDOWN_PROPS', () => {
  it('blocks images and does not skip or enable raw HTML', () => {
    expect(MARKDOWN_PROPS.disallowedElements).toEqual(['img']);
    expect(MARKDOWN_PROPS.skipHtml).toBeUndefined();
    expect(MARKDOWN_PROPS.rehypePlugins).toBeUndefined();
  });
});

describe('getRoutePattern', () => {
  it('replaces dynamic values with their parameter names', () => {
    expect(
      getRoutePattern('/wallet/abc123/home/send/btc/send-funds', {
        clientId: 'abc123',
        coinSlug: 'btc',
      }),
    ).toBe('/wallet/[clientId]/home/send/[coinSlug]/send-funds');
  });

  it('handles encoded values and catch-all arrays', () => {
    expect(getRoutePattern('/a/x%20y/p/q', {id: 'x y', rest: ['p', 'q']})).toBe(
      '/a/[id]/[rest]/[rest]',
    );
  });

  it('leaves static routes alone and tolerates missing params', () => {
    expect(getRoutePattern('/auth/login', null)).toBe('/auth/login');
    expect(getRoutePattern('/wallets/import-wallet', {})).toBe(
      '/wallets/import-wallet',
    );
  });

  it('returns null without a usable pathname', () => {
    expect(getRoutePattern(null, {})).toBeNull();
    expect(getRoutePattern(undefined, {})).toBeNull();
    expect(getRoutePattern('auth/login', {})).toBeNull();
  });
});
