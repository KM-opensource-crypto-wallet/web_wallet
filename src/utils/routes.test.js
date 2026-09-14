import {
  coinRoutes,
  getRouteNameFromPathname,
  paymentLinkPath,
  stripTrailingSlash,
  walletRoutes,
} from './routes';

describe('walletRoutes', () => {
  it('prefixes every wallet-scoped page with /wallet/{clientId}', () => {
    expect(walletRoutes.home('w1')).toBe('/wallet/w1/home');
    expect(walletRoutes.coinSync('w1')).toBe('/wallet/w1/home/coin-sync');
    expect(walletRoutes.confirmBatch('w1')).toBe(
      '/wallet/w1/home/confirm-batch',
    );
    expect(walletRoutes.manageCoins('w1')).toBe('/wallet/w1/manage-coins');
    expect(walletRoutes.buyCrypto('w1')).toBe('/wallet/w1/buy-crypto');
    expect(walletRoutes.buyCryptoOtc2('w1')).toBe('/wallet/w1/buy-crypto/otc2');
    expect(walletRoutes.sellCrypto('w1')).toBe('/wallet/w1/sell-crypto');
    expect(walletRoutes.sellCryptoConfirm('w1')).toBe(
      '/wallet/w1/sell-crypto/confirm',
    );
    expect(walletRoutes.swap('w1')).toBe('/wallet/w1/swap');
    expect(walletRoutes.swapConfirm('w1')).toBe('/wallet/w1/swap/confirm');
    expect(walletRoutes.swapHistory('w1')).toBe('/wallet/w1/swap/history');
    expect(walletRoutes.walletConnect('w1')).toBe('/wallet/w1/wallet-connect');
    expect(walletRoutes.receivePaymentUrl('w1')).toBe(
      '/wallet/w1/receive-payment-url',
    );
    expect(walletRoutes.hideWallet('w1')).toBe(
      '/wallet/w1/wallets/hide-wallet',
    );
    expect(walletRoutes.verifyCreate('w1')).toBe(
      '/wallet/w1/verify/verify-create',
    );
    expect(walletRoutes.verifyScreen('w1')).toBe(
      '/wallet/w1/verify/verify-screen',
    );
  });

  it('URL-encodes the swap transaction id', () => {
    expect(walletRoutes.swapHistoryDetails('w1', 'a/b c')).toBe(
      '/wallet/w1/swap/history/a%2Fb%20c',
    );
  });
});

describe('coinRoutes', () => {
  it('nests every coin-scoped page under /wallet/{clientId}/home/send/{slug}', () => {
    const base = '/wallet/w1/home/send/ethereum-usdt';
    expect(coinRoutes.send('w1', 'ethereum-usdt')).toBe(base);
    expect(coinRoutes.sendFunds('w1', 'ethereum-usdt')).toBe(
      `${base}/send-funds`,
    );
    expect(coinRoutes.transfer('w1', 'ethereum-usdt')).toBe(
      `${base}/send-funds/transfer`,
    );
    expect(coinRoutes.receiveFunds('w1', 'ethereum-usdt')).toBe(
      `${base}/receive-funds`,
    );
    expect(coinRoutes.selectUtxos('w1', 'ethereum-usdt')).toBe(
      `${base}/select-UTXOs`,
    );
    expect(coinRoutes.customDerivation('w1', 'ethereum-usdt')).toBe(
      `${base}/custom-derivation`,
    );
    expect(coinRoutes.transactions('w1', 'ethereum-usdt')).toBe(
      `${base}/transactions`,
    );
    expect(coinRoutes.updateTransaction('w1', 'ethereum-usdt')).toBe(
      `${base}/transactions/update-transaction`,
    );
    expect(coinRoutes.stakingList('w1', 'ethereum-usdt')).toBe(
      `${base}/staking-list`,
    );
    expect(coinRoutes.createStaking('w1', 'ethereum-usdt')).toBe(
      `${base}/create-staking`,
    );
    expect(coinRoutes.voteStaking('w1', 'ethereum-usdt')).toBe(
      `${base}/vote-staking`,
    );
    expect(coinRoutes.withdrawStaking('w1', 'ethereum-usdt')).toBe(
      `${base}/withdraw-staking`,
    );
    expect(coinRoutes.confirmStaking('w1', 'ethereum-usdt')).toBe(
      `${base}/confirm-staking`,
    );
  });

  it('URL-encodes the transaction hash, which may itself be a URL', () => {
    expect(
      coinRoutes.transactionDetails(
        'w1',
        'ethereum-eth',
        'https://etherscan.io/tx/0xabc',
      ),
    ).toBe(
      '/wallet/w1/home/send/ethereum-eth/transactions/https%3A%2F%2Fetherscan.io%2Ftx%2F0xabc',
    );
  });
});

describe('paymentLinkPath', () => {
  it('is wallet-agnostic so a payer can open it on their own wallet', () => {
    expect(paymentLinkPath('ethereum-eth')).toBe(
      '/home/send/ethereum-eth/send-funds',
    );
  });
});

describe('stripTrailingSlash', () => {
  it('removes one trailing slash and leaves the root alone', () => {
    expect(stripTrailingSlash('/wallet/w1/home/')).toBe('/wallet/w1/home');
    expect(stripTrailingSlash('/wallet/w1/home')).toBe('/wallet/w1/home');
    expect(stripTrailingSlash('/')).toBe('/');
    expect(stripTrailingSlash(undefined)).toBe('');
  });
});

describe('getRouteNameFromPathname', () => {
  it('maps the coin-scoped transactions list to TransactionList', () => {
    expect(
      getRouteNameFromPathname(
        '/wallet/w1/home/send/ethereum-eth/transactions',
      ),
    ).toBe('TransactionList');
    expect(
      getRouteNameFromPathname(
        '/wallet/w1/home/send/ethereum-eth/transactions/',
      ),
    ).toBe('TransactionList');
  });

  it('maps a transaction hash and the update screen to TransactionDetails', () => {
    expect(
      getRouteNameFromPathname(
        '/wallet/w1/home/send/ethereum-eth/transactions/0xabc/',
      ),
    ).toBe('TransactionDetails');
    // Parity with the old startsWith('/home/transactions/') check: the
    // speed-up/cancel flow refreshes by txHash from this screen too.
    expect(
      getRouteNameFromPathname(
        '/wallet/w1/home/send/ethereum-eth/transactions/update-transaction/',
      ),
    ).toBe('TransactionDetails');
  });

  it('returns the pathname itself for everything else', () => {
    expect(getRouteNameFromPathname('/wallet/w1/home/')).toBe(
      '/wallet/w1/home/',
    );
    expect(getRouteNameFromPathname('/wallet/w1/home/send/ethereum-eth/')).toBe(
      '/wallet/w1/home/send/ethereum-eth/',
    );
  });
});
