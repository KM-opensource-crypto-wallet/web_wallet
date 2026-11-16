import {
  getContactOptions,
  getRoutePattern,
  isAllowedHref,
  MARKDOWN_PROPS,
} from './policy';

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
  const emailHref = 'mailto:a@b.com?subject=Dok%20support';
  const telegramHref = 'https://t.me/kimlwallet?text=Support%20ID';

  it('returns email, telegram and contact us (unlocked only), in order', () => {
    expect(
      getContactOptions({emailHref, telegramHref, unlocked: true}),
    ).toEqual([
      {type: 'email', href: emailHref},
      {type: 'telegram', href: telegramHref},
      {type: 'contactUs', href: '/contact-us'},
    ]);
  });

  it('omits what does not apply', () => {
    expect(
      getContactOptions({emailHref, telegramHref: '', unlocked: false}),
    ).toEqual([{type: 'email', href: emailHref}]);
    expect(
      getContactOptions({emailHref: '', telegramHref: '', unlocked: false}),
    ).toEqual([]);
    expect(
      getContactOptions({
        emailHref: undefined,
        telegramHref,
        unlocked: false,
      }),
    ).toEqual([{type: 'telegram', href: telegramHref}]);
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
