import {cookies} from 'next/headers';
import {getUserLocale, isLocaleSet, setUserLocale} from './updateLocale';

jest.mock('next/headers', () => ({cookies: jest.fn()}));
jest.mock('src/whitelabel/whiteLabelInfo', () => ({
  getDefaultLocale: () => 'en',
}));

// Behaves like Next's cookie store: `set` keeps the raw value and `get`
// returns it untouched. After a Server Action, Next rebuilds the request
// cookies for the re-render from exactly these raw entries.
const jar = (initial = {}) => {
  const entries = new Map(
    Object.entries(initial).map(([name, value]) => [name, {name, value}]),
  );
  return {
    get: name => entries.get(name),
    set: (name, value) => {
      entries.set(name, {name, value});
    },
  };
};

const useJar = initial => {
  const store = jar(initial);
  cookies.mockResolvedValue(store);
  return store;
};

// What a forged `$@1` Flight reference decodes to: awaiting it runs React's
// chunk parser, which throws on the attacker's body (DOKWALLET-WALLET-WEB-1N).
const forgedChunk = () => ({
  then: jest.fn((resolve, reject) =>
    reject(new SyntaxError('Unexpected token \'e\', "en" is not valid JSON')),
  ),
});

describe('setUserLocale', () => {
  it('stores a locale tag', async () => {
    const store = useJar();
    await setUserLocale('he');
    expect(store.get('NEXT_LOCALE')?.value).toBe('he');
  });

  it('ignores anything that is not a locale tag', async () => {
    const store = useJar();
    await setUserLocale(forgedChunk());
    await setUserLocale('he; Path=/');
    expect(store.get('NEXT_LOCALE')).toBeUndefined();
  });
});

describe('getUserLocale', () => {
  it('returns the stored locale', async () => {
    useJar({NEXT_LOCALE: 'he'});
    await expect(getUserLocale()).resolves.toBe('he');
  });

  it('never hands a non-tag cookie value to next-intl', async () => {
    const chunk = forgedChunk();
    useJar({NEXT_LOCALE: chunk});
    await expect(getUserLocale()).resolves.toBe('en');
    expect(chunk.then).not.toHaveBeenCalled();
  });
});

describe('isLocaleSet', () => {
  it('is true only when a locale tag is stored', async () => {
    useJar({NEXT_LOCALE: 'he'});
    await expect(isLocaleSet()).resolves.toBe(true);
    useJar({NEXT_LOCALE: forgedChunk()});
    await expect(isLocaleSet()).resolves.toBe(false);
    useJar();
    await expect(isLocaleSet()).resolves.toBe(false);
  });
});
