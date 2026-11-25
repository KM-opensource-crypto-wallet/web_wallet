import {isLocaleTag, resolveDefaultLocale} from './localeCookie';

describe('isLocaleTag', () => {
  it.each(['en', 'he', 'pt-BR', 'zh-Hant-TW'])('accepts %s', value => {
    expect(isLocaleTag(value)).toBe(true);
  });

  it('rejects what a forged Server Action payload can decode to', () => {
    // DOKWALLET-WALLET-WEB-1N / 1Q: a Flight `$@1` reference arrives as a
    // thenable, which the next render would await.
    expect(isLocaleTag({then: () => {}})).toBe(false);
    expect(isLocaleTag({})).toBe(false);
    expect(isLocaleTag(['en'])).toBe(false);
    expect(isLocaleTag(42)).toBe(false);
    expect(isLocaleTag(null)).toBe(false);
    expect(isLocaleTag(undefined)).toBe(false);
  });

  it.each([
    '',
    ' en',
    'en;',
    'en\n',
    'pt_BR',
    '../en',
    'e',
    `en-${'x'.repeat(40)}`,
  ])('rejects the malformed string %p', value => {
    expect(isLocaleTag(value)).toBe(false);
  });
});

describe('resolveDefaultLocale', () => {
  it("keeps a whitelabel's valid default", () => {
    expect(resolveDefaultLocale('he')).toBe('he');
  });

  it('falls back to en for a missing or malformed default', () => {
    expect(resolveDefaultLocale(undefined)).toBe('en');
    expect(resolveDefaultLocale('pt_BR')).toBe('en');
  });
});
