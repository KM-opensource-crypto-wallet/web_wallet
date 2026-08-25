import {reattachPrivateKeys, stripPrivateKeys} from 'utils/electrumPrivateKeys';

// Pure data shaping, so these assert directly instead of through a fetch stub.
describe('stripPrivateKeys', () => {
  it('removes keys from derive addresses and leaves everything else', () => {
    const payload = {
      derive_addresses: [
        {address: 'addr-1', privateKey: 'secret-1', balance: '10'},
        {address: 'addr-2'},
      ],
      somethingElse: 'kept',
    };
    expect(stripPrivateKeys(payload)).toEqual({
      derive_addresses: [
        {address: 'addr-1', balance: '10'},
        {address: 'addr-2'},
      ],
      somethingElse: 'kept',
    });
  });

  it('removes keys from transaction data', () => {
    expect(
      stripPrivateKeys({
        transaction_data: [{txid: 'tx-1', vout: 0, privateKey: 'secret-2'}],
      }),
    ).toEqual({transaction_data: [{txid: 'tx-1', vout: 0}]});
  });

  it('does not mutate the caller’s payload', () => {
    const payload = {
      derive_addresses: [{address: 'addr-1', privateKey: 'secret-1'}],
    };
    stripPrivateKeys(payload);
    // The original still has to carry the key — reattach reads it back out.
    expect(payload.derive_addresses[0].privateKey).toBe('secret-1');
  });

  it('leaves payloads with neither list alone', () => {
    expect(stripPrivateKeys({txHex: 'deadbeef'})).toEqual({txHex: 'deadbeef'});
  });

  it('removes a root-level key', () => {
    expect(stripPrivateKeys({address: 'addr-1', privateKey: 'secret'})).toEqual(
      {address: 'addr-1'},
    );
  });

  it('removes keys nested anywhere, not just in the two known lists', () => {
    const payload = {
      change: {address: 'addr-2', privateKey: 'secret-2'},
      inputs: [{utxos: [{txid: 'tx-1', privateKey: 'secret-3'}]}],
    };
    expect(stripPrivateKeys(payload)).toEqual({
      change: {address: 'addr-2'},
      inputs: [{utxos: [{txid: 'tx-1'}]}],
    });
  });

  it('does not mutate nested input', () => {
    const payload = {change: {address: 'a', privateKey: 'secret'}};
    stripPrivateKeys(payload);
    expect(payload.change.privateKey).toBe('secret');
  });

  it('passes non-object list entries through', () => {
    // The transactions/addressusage ops send plain address strings.
    expect(stripPrivateKeys({derive_addresses: ['addr-1', null]})).toEqual({
      derive_addresses: ['addr-1', null],
    });
  });

  it('normalizes a missing payload to an object', () => {
    expect(stripPrivateKeys(undefined)).toEqual({});
  });
});

describe('reattachPrivateKeys', () => {
  it('matches balances back up by address', () => {
    const original = {
      derive_addresses: [{address: 'addr-1', privateKey: 'secret-1'}],
    };
    const result = {
      data: {deriveAddresses: [{address: 'addr-1', balance: '10'}]},
    };
    expect(
      reattachPrivateKeys('balances', original, result).data.deriveAddresses,
    ).toEqual([{address: 'addr-1', balance: '10', privateKey: 'secret-1'}]);
  });

  it('matches txdetails back up by txid:vout', () => {
    const original = {
      transaction_data: [{txid: 'tx-1', vout: 0, privateKey: 'secret-2'}],
    };
    const result = {data: [{txid: 'tx-1', vout: 0, value: 5}]};
    expect(reattachPrivateKeys('txdetails', original, result).data).toEqual([
      {txid: 'tx-1', vout: 0, value: 5, privateKey: 'secret-2'},
    ]);
  });

  it('leaves an address with no matching key untouched', () => {
    const result = {
      data: {deriveAddresses: [{address: 'unknown', balance: '0'}]},
    };
    expect(
      reattachPrivateKeys('balances', {derive_addresses: []}, result).data
        .deriveAddresses,
    ).toEqual([{address: 'unknown', balance: '0'}]);
  });

  it('does nothing for ops that carry no keys', () => {
    const result = {data: [1, 2, 3]};
    expect(reattachPrivateKeys('utxo', {}, result)).toBe(result);
  });

  // The two matchers deliberately differ on empty keys: a derive address with
  // no usable key contributes nothing, but buildUTXO distinguishes "no key
  // field" from "empty key" on a watch-only input, so that must round-trip.
  describe('empty-key handling differs by op, on purpose', () => {
    it('balances ignores a falsy key', () => {
      const result = {
        data: {deriveAddresses: [{address: 'addr-1', balance: '0'}]},
      };
      const out = reattachPrivateKeys(
        'balances',
        {derive_addresses: [{address: 'addr-1', privateKey: ''}]},
        result,
      );
      expect(out.data.deriveAddresses[0]).not.toHaveProperty('privateKey');
    });

    it('txdetails preserves a defined-but-empty key', () => {
      const result = {data: [{txid: 'tx-1', vout: 0}]};
      const out = reattachPrivateKeys(
        'txdetails',
        {transaction_data: [{txid: 'tx-1', vout: 0, privateKey: ''}]},
        result,
      );
      expect(out.data[0].privateKey).toBe('');
    });
  });
});
