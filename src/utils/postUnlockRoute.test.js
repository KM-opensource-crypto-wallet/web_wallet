import {RESET_WALLET_ROUTE, resolvePostUnlockRoute} from './postUnlockRoute';

const params = entries => new URLSearchParams(entries);

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
      route: '/wallet/w1/swap?aid=abc&',
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
      route: '/wallet/w2/home?aid=abc&',
      hasWallet: true,
      replayed: false,
    });
  });

  it('tolerates a missing searchParams', () => {
    expect(resolvePostUnlockRoute(state([{clientId: 'w1'}]), null)).toEqual({
      route: '/wallet/w1/home',
      hasWallet: true,
      replayed: false,
    });
  });
});
