import {resolveLegacyRoute} from './legacyRoutes';

const eth = {
  _id: '1',
  chain_name: 'ethereum',
  chain_symbol: 'ETH',
  symbol: 'ETH',
};
const usdt = {
  _id: '2',
  chain_name: 'ethereum',
  chain_symbol: 'ETH',
  symbol: 'USDT',
};
const coins = [eth, usdt];

const resolve = (pathname, search = '', overrides = {}) =>
  resolveLegacyRoute({
    pathname,
    searchParams: new URLSearchParams(search),
    clientId: 'w1',
    coins,
    currentCoinSlug: 'ethereum-eth',
    ...overrides,
  });

describe('resolveLegacyRoute: wallet-scoped paths', () => {
  it.each([
    ['/home', '/wallet/w1/home'],
    ['/home/', '/wallet/w1/home'],
    ['/home/coin-sync/', '/wallet/w1/home/coin-sync'],
    ['/home/confirm-batch', '/wallet/w1/home/confirm-batch'],
    ['/buy-crypto', '/wallet/w1/buy-crypto'],
    ['/buy-crypto/otc2/', '/wallet/w1/buy-crypto/otc2'],
    ['/sell-crypto', '/wallet/w1/sell-crypto'],
    ['/sell-crypto/confirm', '/wallet/w1/sell-crypto/confirm'],
    ['/swap', '/wallet/w1/swap'],
    ['/swap/confirm', '/wallet/w1/swap/confirm'],
    ['/swap/history', '/wallet/w1/swap/history'],
    ['/swap/history/abc%2F1/', '/wallet/w1/swap/history/abc%2F1'],
    ['/manage-coins', '/wallet/w1/manage-coins'],
    ['/wallet-connect/', '/wallet/w1/wallet-connect'],
    ['/receive-payment-url', '/wallet/w1/receive-payment-url'],
    ['/verify/verify-create', '/wallet/w1/verify/verify-create'],
    ['/verify/verify-screen/', '/wallet/w1/verify/verify-screen'],
    ['/wallets/hide-wallet', '/wallet/w1/wallets/hide-wallet'],
  ])('%s -> %s', (from, to) => {
    expect(resolve(from)).toEqual({path: to, query: ''});
  });

  it('preserves the query string', () => {
    expect(resolve('/verify/verify-create/', 'showSeedPhrase=true')).toEqual({
      path: '/wallet/w1/verify/verify-create',
      query: 'showSeedPhrase=true',
    });
  });
});

describe('resolveLegacyRoute: coin-scoped paths use the current coin', () => {
  it.each([
    ['/home/send', '/wallet/w1/home/send/ethereum-eth'],
    ['/home/send/', '/wallet/w1/home/send/ethereum-eth'],
    ['/home/send/send-funds', '/wallet/w1/home/send/ethereum-eth/send-funds'],
    [
      '/home/send/send-funds/transfer/',
      '/wallet/w1/home/send/ethereum-eth/send-funds/transfer',
    ],
    [
      '/home/send/receive-funds',
      '/wallet/w1/home/send/ethereum-eth/receive-funds',
    ],
    [
      '/home/send/select-UTXOs',
      '/wallet/w1/home/send/ethereum-eth/select-UTXOs',
    ],
    [
      '/home/send/custom-derivation/',
      '/wallet/w1/home/send/ethereum-eth/custom-derivation',
    ],
    ['/home/transactions', '/wallet/w1/home/send/ethereum-eth/transactions'],
    [
      '/home/transactions/0xhash/',
      '/wallet/w1/home/send/ethereum-eth/transactions/0xhash',
    ],
    [
      '/home/transactions/update-transaction',
      '/wallet/w1/home/send/ethereum-eth/transactions/update-transaction',
    ],
    ['/home/staking-list/', '/wallet/w1/home/send/ethereum-eth/staking-list'],
    [
      '/home/create-staking',
      '/wallet/w1/home/send/ethereum-eth/create-staking',
    ],
    ['/home/vote-staking', '/wallet/w1/home/send/ethereum-eth/vote-staking'],
    [
      '/home/withdraw-staking',
      '/wallet/w1/home/send/ethereum-eth/withdraw-staking',
    ],
    [
      '/home/confirm-staking',
      '/wallet/w1/home/send/ethereum-eth/confirm-staking',
    ],
  ])('%s -> %s', (from, to) => {
    expect(resolve(from)).toEqual({path: to, query: ''});
  });

  it('falls back to wallet home when there is no current coin', () => {
    expect(resolve('/home/send', '', {currentCoinSlug: null})).toEqual({
      path: '/wallet/w1/home',
      query: '',
    });
    expect(resolve('/home/transactions', '', {currentCoinSlug: null})).toEqual({
      path: '/wallet/w1/home',
      query: '',
    });
  });
});

describe('resolveLegacyRoute: payment links', () => {
  it('converts currency=chain_name:SYMBOL into the coin slug and drops it from the query', () => {
    expect(
      resolve(
        '/home/send/send-funds',
        'address=0xF8&amount=0.01&currency=ethereum:USDT',
      ),
    ).toEqual({
      path: '/wallet/w1/home/send/ethereum-usdt/send-funds',
      query: 'address=0xF8&amount=0.01',
    });
  });

  it('accepts the older currency=CHAIN_SYMBOL:SYMBOL form', () => {
    expect(
      resolve('/home/send/send-funds/', 'currency=ETH:USDT&amount=1'),
    ).toEqual({
      path: '/wallet/w1/home/send/ethereum-usdt/send-funds',
      query: 'amount=1',
    });
  });

  it('survives the post-login replay (trailing & producing an empty key)', () => {
    expect(
      resolve(
        '/home/send/send-funds/',
        'address=A&currency=ethereum:ETH&amount=0.01&',
      ),
    ).toEqual({
      path: '/wallet/w1/home/send/ethereum-eth/send-funds',
      query: 'address=A&amount=0.01',
    });
  });

  it('sends an unknown currency to wallet home with a toast', () => {
    expect(
      resolve('/home/send/send-funds', 'currency=tron:TRX&address=T1'),
    ).toEqual({
      path: '/wallet/w1/home',
      query: 'address=T1',
      toast: 'Currency not found in the selected wallet',
    });
  });

  it('forwards the new wallet-agnostic /home/send/{slug}/... shape unchanged', () => {
    expect(
      resolve('/home/send/ethereum-usdt/send-funds/', 'address=0xF8&amount=1'),
    ).toEqual({
      path: '/wallet/w1/home/send/ethereum-usdt/send-funds',
      query: 'address=0xF8&amount=1',
    });
    expect(resolve('/home/send/tron-trx/staking-list')).toEqual({
      path: '/wallet/w1/home/send/tron-trx/staking-list',
      query: '',
    });
  });
});

describe('resolveLegacyRoute: unknown pages under /home', () => {
  it('lands on wallet Home instead of forwarding to a 404', () => {
    expect(resolve('/home/abcd')).toEqual({path: '/wallet/w1/home', query: ''});
    expect(resolve('/home/abcd/efg/', 'x=1')).toEqual({
      path: '/wallet/w1/home',
      query: 'x=1',
    });
  });

  it('drops an unknown page under a coin slug back to that coin', () => {
    expect(resolve('/home/send/ethereum-usdt/abcd/')).toEqual({
      path: '/wallet/w1/home/send/ethereum-usdt',
      query: '',
    });
  });
});

describe('resolveLegacyRoute: retired features', () => {
  it('sends the removed chat pages to the wallet Home', () => {
    expect(resolve('/chats')).toEqual({path: '/wallet/w1/home', query: ''});
    expect(resolve('/chats/chat/')).toEqual({
      path: '/wallet/w1/home',
      query: '',
    });
    expect(resolve('/chats/new-chat/', 'x=1')).toEqual({
      path: '/wallet/w1/home',
      query: 'x=1',
    });
  });
});

describe('resolveLegacyRoute: unknown paths', () => {
  it('returns null so the caller can decide', () => {
    expect(resolve('/settings')).toBeNull();
    expect(resolve('/wallet/w1/home')).toBeNull();
    expect(resolve('')).toBeNull();
  });
});
