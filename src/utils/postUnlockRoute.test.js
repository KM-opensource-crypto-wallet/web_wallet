import {RESET_WALLET_ROUTE, resolvePostUnlockRoute} from './postUnlockRoute';

const params = entries => new URLSearchParams(entries);

const ORIGIN = 'https://wallet.example';
const realWindow = global.window;
beforeAll(() => {
  global.window = {location: {origin: ORIGIN}};
});
afterAll(() => {
  global.window = realWindow;
});

const state = (allWallets, currentWalletClientId = 'w1') => ({
  wallets: {allWallets, currentWalletClientId},
});

describe('resolvePostUnlockRoute', () => {
  it('goes to the current wallet home when the unlocked store has wallets', () => {
    expect(
      resolvePostUnlockRoute(state([{clientId: 'w1'}]), params('')),
    ).toEqual({route: '/wallet/w1/home', hasWallet: true, replayed: false});
  });

  it('goes to reset-wallet only when the unlocked store has no wallets', () => {
    expect(resolvePostUnlockRoute(state([]), params(''))).toEqual({
      route: RESET_WALLET_ROUTE,
      hasWallet: false,
      replayed: false,
    });
    expect(resolvePostUnlockRoute({wallets: undefined}, params(''))).toEqual({
      route: RESET_WALLET_ROUTE,
      hasWallet: false,
      replayed: false,
    });
  });

  it('replays redirectRoute and forwards the other query params', () => {
    expect(
      resolvePostUnlockRoute(
        state([{clientId: 'w1'}]),
        params('aid=abc&redirectRoute=%2Fwallet%2Fw1%2Fswap'),
      ),
    ).toEqual({
      route: '/wallet/w1/swap?aid=abc',
      hasWallet: true,
      replayed: true,
    });
  });

  it('keeps extra query params on the home route without replaying', () => {
    expect(
      resolvePostUnlockRoute(
        state([{clientId: 'w1'}], 'w2'),
        params('aid=abc'),
      ),
    ).toEqual({
      route: '/wallet/w2/home?aid=abc',
      hasWallet: true,
      replayed: false,
    });
  });

  it('re-encodes forwarded values so delimiters inside them stay data', () => {
    expect(
      resolvePostUnlockRoute(
        state([{clientId: 'w1'}]),
        params(
          'next=a%26b%3Dc%23d&tag=x&tag=y&redirectRoute=%2Fwallet%2Fw1%2Fswap%3Ffrom%3Deth',
        ),
      ),
    ).toEqual({
      route: '/wallet/w1/swap?from=eth&next=a%26b%3Dc%23d&tag=x&tag=y',
      hasWallet: true,
      replayed: true,
    });
  });

  it.each([
    ['an absolute external URL', 'https://evil.example/steal'],
    ['a protocol-relative URL', '//evil.example/steal'],
    ['a backslash host', '/\\evil.example/steal'],
    ['a javascript: URL', 'javascript:alert(1)'],
  ])('never replays %s; stays on the wallet home route', (_, redirect) => {
    expect(
      resolvePostUnlockRoute(
        state([{clientId: 'w1'}]),
        params({aid: 'abc', redirectRoute: redirect}),
      ),
    ).toEqual({
      route: '/wallet/w1/home?aid=abc',
      hasWallet: true,
      replayed: false,
    });
  });

  it('replays an absolute URL on this origin as its path', () => {
    expect(
      resolvePostUnlockRoute(
        state([{clientId: 'w1'}]),
        params({redirectRoute: `${ORIGIN}/wallet/w1/swap`}),
      ),
    ).toEqual({route: '/wallet/w1/swap', hasWallet: true, replayed: true});
  });

  it('tolerates a missing searchParams', () => {
    expect(resolvePostUnlockRoute(state([{clientId: 'w1'}]), null)).toEqual({
      route: '/wallet/w1/home',
      hasWallet: true,
      replayed: false,
    });
  });
});
