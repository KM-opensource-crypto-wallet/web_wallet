import {scrubObject, scrubString, stripQuery} from './scrub';

const MNEMONIC =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';
const HEX64 = 'a'.repeat(64);
const WIF = 'L1aW4aubDFB7yfras2S1mN3bqg9nwySY8nkoLmJebSLD5BWv3ENZ';

describe('scrubString', () => {
  it('redacts a 12-word mnemonic embedded in text', () => {
    const out = scrubString(`phrase was ${MNEMONIC} end`);
    expect(out).not.toContain('abandon ability');
    expect(out).toContain('[REDACTED_MNEMONIC]');
  });

  it('redacts a 24-word mnemonic', () => {
    const words = Array(24).fill('zoo').join(' ');
    expect(scrubString(words)).toBe('[REDACTED_MNEMONIC]');
  });

  it('leaves ordinary sentences alone', () => {
    const msg = 'Error in fetch balance for bitcoin: request timed out';
    expect(scrubString(msg)).toBe(msg);
  });

  it('redacts 64-hex with and without 0x prefix', () => {
    expect(scrubString(`key=0x${HEX64}`)).toBe('key=[REDACTED_HEX]');
    expect(scrubString(`key=${HEX64}`)).toBe('key=[REDACTED_HEX]');
  });

  it('redacts a WIF private key', () => {
    expect(scrubString(`wif ${WIF}`)).toBe('wif [REDACTED_KEY]');
  });

  it('redacts extended private keys', () => {
    const xprv = 'xprv' + 'A'.repeat(107);
    expect(scrubString(xprv)).toBe('[REDACTED_KEY]');
  });

  it.each(['x', 'y', 'z', 't', 'u', 'v', 'Y', 'Z', 'U', 'V'])(
    'redacts SLIP-132 %sprv extended private keys',
    prefix => {
      const key = `${prefix}prv` + 'A'.repeat(107);
      expect(scrubString(`key ${key} end`)).toBe('key [REDACTED_KEY] end');
    },
  );

  it.each([
    ['uncompressed testnet', '9' + 'A'.repeat(50)],
    ['compressed testnet', 'c' + 'A'.repeat(51)],
    ['uncompressed mainnet', '5' + 'A'.repeat(50)],
    ['compressed mainnet', 'K' + 'A'.repeat(51)],
  ])('redacts %s WIF keys', (_label, key) => {
    expect(scrubString(`wif ${key}`)).toBe('wif [REDACTED_KEY]');
  });

  it('redacts sensitive JSON key/value pairs inside stringified objects', () => {
    const json = JSON.stringify({
      privateKey: 'secret-value',
      password: 'hunter2',
      chain: 'ethereum',
    });
    const out = scrubString(json);
    expect(out).not.toContain('secret-value');
    expect(out).not.toContain('hunter2');
    expect(out).toContain('"chain":"ethereum"');
  });

  it('truncates very long strings', () => {
    const out = scrubString('x'.repeat(5000));
    expect(out.length).toBeLessThanOrEqual(1024 + 20);
    expect(out.endsWith('…[truncated]')).toBe(true);
  });

  it('passes non-strings through', () => {
    expect(scrubString(42)).toBe(42);
    expect(scrubString(null)).toBe(null);
  });
});

describe('scrubObject', () => {
  it('drops sensitive keys and axios-shaped keys', () => {
    const out = scrubObject({
      phrase: MNEMONIC,
      privateKey: HEX64,
      password: 'x',
      data: {anything: 1},
      headers: {Authorization: 'Bearer x'},
      config: {url: 'x'},
      chain: 'bitcoin',
    });
    expect(out).toEqual({chain: 'bitcoin'});
  });

  it('keeps allow-listed keys such as tx_hash', () => {
    const out = scrubObject(
      {tx_hash: HEX64, hash: HEX64},
      {allowKeys: ['tx_hash']},
    );
    expect(out.tx_hash).toBe(HEX64);
    expect(out.hash).toBeUndefined();
  });

  it('scrubs nested strings and arrays', () => {
    const out = scrubObject({a: {b: [`k ${HEX64}`, 'fine']}});
    expect(out.a.b[0]).toBe('k [REDACTED_HEX]');
    expect(out.a.b[1]).toBe('fine');
  });

  it('stops at the depth limit instead of recursing forever', () => {
    const cyclic = {};
    cyclic.self = cyclic;
    expect(() => scrubObject(cyclic)).not.toThrow();
  });

  it('passes primitives and null through', () => {
    expect(scrubObject(null)).toBe(null);
    expect(scrubObject('a')).toBe('a');
  });
});

describe('stripQuery', () => {
  it('keeps origin and path only', () => {
    expect(stripQuery('https://api.dokwallet.com/v1/coins?apiKey=abc#x')).toBe(
      'https://api.dokwallet.com/v1/coins',
    );
  });

  it('handles relative paths and garbage', () => {
    expect(stripQuery('/v1/coins?x=1')).toBe('/v1/coins');
    expect(stripQuery(undefined)).toBe(undefined);
  });
});
