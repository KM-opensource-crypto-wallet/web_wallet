import {
  findCoinByCurrency,
  findCoinBySlug,
  getCoinSlug,
  popupCenter,
} from './common';

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
const lightning = {
  _id: '3',
  chain_name: 'bitcoin_lightning',
  chain_symbol: 'BTC',
  symbol: 'BTC',
};
const coins = [eth, usdt, lightning];

describe('getCoinSlug', () => {
  it('lower-cases chain_name-symbol', () => {
    expect(getCoinSlug(usdt)).toBe('ethereum-usdt');
    expect(getCoinSlug(lightning)).toBe('bitcoin_lightning-btc');
  });

  it('returns null for a missing coin', () => {
    expect(getCoinSlug(null)).toBeNull();
    expect(getCoinSlug(undefined)).toBeNull();
  });
});

describe('findCoinBySlug', () => {
  it('finds the coin whose slug matches exactly', () => {
    expect(findCoinBySlug(coins, 'ethereum-usdt')).toBe(usdt);
  });

  it('returns null for an unknown, empty, or undefined slug', () => {
    expect(findCoinBySlug(coins, 'ethereum-dai')).toBeNull();
    expect(findCoinBySlug(coins, '')).toBeNull();
    expect(findCoinBySlug(coins, undefined)).toBeNull();
    expect(findCoinBySlug(undefined, 'ethereum-usdt')).toBeNull();
  });
});

describe('findCoinByCurrency', () => {
  it('accepts chain_name:symbol in any case', () => {
    expect(findCoinByCurrency(coins, 'ethereum:ETH')).toBe(eth);
    expect(findCoinByCurrency(coins, 'ETHEREUM:usdt')).toBe(usdt);
  });

  it('accepts the legacy chain_symbol:symbol form', () => {
    expect(findCoinByCurrency(coins, 'ETH:USDT')).toBe(usdt);
    expect(findCoinByCurrency(coins, 'BTC:BTC')).toBe(lightning);
  });

  it('accepts the slug form', () => {
    expect(findCoinByCurrency(coins, 'ethereum-usdt')).toBe(usdt);
  });

  it('returns null when nothing matches or the value is empty', () => {
    expect(findCoinByCurrency(coins, 'tron:TRX')).toBeNull();
    expect(findCoinByCurrency(coins, '')).toBeNull();
    expect(findCoinByCurrency(coins, undefined)).toBeNull();
    expect(findCoinByCurrency(undefined, 'ethereum:ETH')).toBeNull();
  });
});

describe('popupCenter', () => {
  const stubWindow = open => {
    global.window = {
      screenLeft: 0,
      screenTop: 0,
      innerWidth: 1000,
      innerHeight: 800,
      screen: {availWidth: 1000},
      open,
    };
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    delete global.window;
  });

  it('opens without noopener so the handle can be polled', async () => {
    const open = jest.fn(() => ({closed: false, close: jest.fn()}));
    stubWindow(open);
    await popupCenter({url: 'https://example.com', callback: jest.fn()});
    expect(open.mock.calls[0][2]).not.toMatch(/noopener/);
  });

  it('cuts the opener on the opened window', async () => {
    const popup = {closed: false, opener: {}, close: jest.fn()};
    stubWindow(() => popup);
    await popupCenter({url: 'https://example.com', callback: jest.fn()});
    expect(popup.opener).toBeNull();
  });

  it('reports a blocked popup as closed and returns null without polling', async () => {
    stubWindow(() => null);
    const callback = jest.fn();
    const result = await popupCenter({url: 'https://example.com', callback});
    expect(result).toBeNull();
    expect(callback).toHaveBeenCalledWith(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('calls back once and stops polling when the popup is closed', async () => {
    const popup = {closed: false, close: jest.fn()};
    stubWindow(() => popup);
    const callback = jest.fn();
    await popupCenter({url: 'https://example.com', callback});
    jest.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
    popup.closed = true;
    jest.advanceTimersByTime(3000);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('passes the send-funds query params back on success', async () => {
    const popup = {
      closed: false,
      close: jest.fn(),
      location: {href: 'https://app.test/send-funds?transactionId=abc'},
    };
    stubWindow(() => popup);
    const callback = jest.fn();
    await popupCenter({url: 'https://example.com', callback});
    jest.advanceTimersByTime(1000);
    expect(popup.close).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(
      true,
      expect.objectContaining({transactionId: 'abc'}),
    );
  });
});
