import {MainNavigation} from './navigation';
import {store} from 'src/redux/store';
import {
  selectCurrentCoin,
  selectCurrentWalletClientId,
  selectUserCoins,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

jest.mock('src/redux/store', () => ({
  store: {getState: jest.fn(() => ({})), dispatch: jest.fn()},
}));
jest.mock(
  'dok-wallet-blockchain-networks/redux/wallets/walletsSelector',
  () => ({
    selectCurrentCoin: jest.fn(),
    selectCurrentWalletClientId: jest.fn(),
    selectUserCoins: jest.fn(),
  }),
);

const BTC = {_id: 'btc', chain_name: 'bitcoin', symbol: 'BTC'};
const ETH = {_id: 'eth', chain_name: 'ethereum', symbol: 'ETH'};
const HASH = '0x' + 'ab'.repeat(32);

describe('MainNavigation.navigate: TransactionDetails', () => {
  const navigator = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    MainNavigation.setNavigator(navigator);
    selectCurrentWalletClientId.mockReturnValue('w1');
    selectCurrentCoin.mockReturnValue(BTC);
    selectUserCoins.mockReturnValue([BTC, ETH]);
  });

  it('opens the coin the transaction was sent from, not the selected coin', () => {
    // A batch is confirmed outside /send/[coinSlug], so BTC can still be
    // selected while the batch went out from the ETH coin.
    const transaction = {
      link: HASH,
      isBatchTransaction: true,
      currentCoin: {_id: 'eth', chain_name: 'ethereum', symbol: 'ETH'},
    };

    MainNavigation.navigate({
      name: 'TransactionDetails',
      params: {transaction},
    });

    expect(navigator).toHaveBeenCalledWith(
      `/wallet/w1/home/send/ethereum-eth/transactions/${HASH}`,
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {TransactionDetails: {transaction}},
      }),
    );
  });

  it('falls back to the selected coin when the transaction coin is not in the wallet', () => {
    const transaction = {
      link: HASH,
      currentCoin: {_id: 'gone', chain_name: 'base', symbol: 'ETH'},
    };

    MainNavigation.navigate({
      name: 'TransactionDetails',
      params: {transaction},
    });

    expect(navigator).toHaveBeenCalledWith(
      `/wallet/w1/home/send/bitcoin-btc/transactions/${HASH}`,
    );
  });

  it('falls back to the selected coin when the transaction has no coin', () => {
    MainNavigation.navigate({
      name: 'TransactionDetails',
      params: {transaction: {link: HASH}},
    });

    expect(navigator).toHaveBeenCalledWith(
      `/wallet/w1/home/send/bitcoin-btc/transactions/${HASH}`,
    );
  });

  it('does nothing without a transaction hash', () => {
    MainNavigation.navigate({
      name: 'TransactionDetails',
      params: {transaction: {currentCoin: ETH}},
    });

    expect(navigator).not.toHaveBeenCalled();
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
