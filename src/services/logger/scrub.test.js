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

  it('redacts a Solana base58 secret key', () => {
    const key =
      'DyXZZCSiBREJ8YZ5cULd7PVdKpbkhHvHJ7otbJmLJajJtRsyq1irMMqKimYeKvRmZ8Sc2qWLhKjYR4ekM8RSzkV';
    expect(scrubString(`sk ${key} end`)).toBe('sk [REDACTED_KEY] end');
  });

  it('redacts a Stellar secret seed', () => {
    const seed = 'SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3U6MM63WBSBZATAQI3EBTQ4';
    expect(scrubString(`seed ${seed} end`)).toBe('seed [REDACTED_KEY] end');
  });

  it('redacts 128-character hex keys with and without 0x prefix', () => {
    const hex128 = 'b'.repeat(128);
    expect(scrubString(`key=${hex128}`)).toBe('key=[REDACTED_HEX]');
    expect(scrubString(`key=0x${hex128}`)).toBe('key=[REDACTED_HEX]');
  });

  it('redacts a mnemonic that starts with a capital letter', () => {
    expect(scrubString(`phrase: A${MNEMONIC.slice(1)}.`)).toBe(
      'phrase: [REDACTED_MNEMONIC].',
    );
  });

  it.each([
    ['commas', ','],
    ['commas and spaces', ', '],
  ])('redacts a mnemonic separated by %s', (_label, separator) => {
    const out = scrubString(`[${MNEMONIC.split(' ').join(separator)}]`);
    expect(out).not.toContain('ability');
    expect(out).toBe('[[REDACTED_MNEMONIC]]');
  });

  it.each([
    ['once', 2],
    ['twice', 3],
  ])(
    'redacts sensitive pairs inside JSON escaped %s',
    (_label, stringifyCount) => {
      let json = {privateKey: 'secret-value', chain: 'ethereum'};
      for (let i = 0; i < stringifyCount; i++) {
        json = JSON.stringify(json);
      }
      const out = scrubString(json);
      expect(out).not.toContain('secret-value');
      expect(out).toContain('ethereum');
    },
  );

  it.each([
    ['once', 2],
    ['twice', 3],
  ])(
    'redacts a value with an embedded quote inside JSON escaped %s',
    (_label, stringifyCount) => {
      let json = {password: 'abc"leaked-part', chain: 'ethereum'};
      for (let i = 0; i < stringifyCount; i++) {
        json = JSON.stringify(json);
      }
      const out = scrubString(json);
      expect(out).not.toContain('leaked-part');
      expect(out).toContain('ethereum');
    },
  );

  it.each([
    ['once', 2],
    ['twice', 3],
  ])(
    'redacts a value ending in a backslash and the secret after it, JSON escaped %s',
    (_label, stringifyCount) => {
      let json = {
        password: 'leaked-a\\',
        secret: 'leaked-b',
        chain: 'ethereum',
      };
      for (let i = 0; i < stringifyCount; i++) {
        json = JSON.stringify(json);
      }
      const out = scrubString(json);
      expect(out).not.toMatch(/leaked/);
      expect(out).toContain('ethereum');
    },
  );

  it.each([
    ['once', 2],
    ['twice', 3],
  ])(
    'redacts a last field ending in a backslash, JSON escaped %s',
    (_label, stringifyCount) => {
      let json = {chain: 'ethereum', password: 'leaked-c\\'};
      for (let i = 0; i < stringifyCount; i++) {
        json = JSON.stringify(json);
      }
      const out = scrubString(json);
      expect(out).not.toContain('leaked-c');
      expect(out).toContain('ethereum');
    },
  );

  it('stays fast on an unterminated value with repeated escaped quotes', () => {
    const bs = '\\';
    const input = `${bs}"password${bs}":${bs}"${`${bs.repeat(3)}"`.repeat(
      24,
    )}incomplete`;
    const started = Date.now();
    scrubString(input);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('stays fast on a long run of backslashes', () => {
    const started = Date.now();
    scrubString(`${'\\'.repeat(100000)}"password`);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('leaves capitalised prose and comma lists alone', () => {
    const messages = [
      'Could not load the coin data from the server, retry later',
      'Chains: bitcoin, ethereum, solana, polygon',
    ];
    messages.forEach(msg => expect(scrubString(msg)).toBe(msg));
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
