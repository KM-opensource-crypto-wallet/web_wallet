import {findCoinByCurrency, findCoinBySlug, getCoinSlug} from './common';

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
