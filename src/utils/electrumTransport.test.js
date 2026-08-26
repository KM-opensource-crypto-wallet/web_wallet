/* global AbortSignal */
import {
  isElectrumQueryAvailable,
  runElectrumQuery,
} from 'utils/electrumTransport';

const jsonResponse = (body, {ok = true, status = 200} = {}) => ({
  ok,
  status,
  json: async () => body,
});

// Rejects only when the request's signal aborts, standing in for a bridge that
// accepts the request and then never answers.
const hangingFetch = () =>
  jest.fn(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () =>
          reject(new Error('The user aborted a request.')),
        );
      }),
  );

afterEach(() => {
  jest.useRealTimers();
  delete global.fetch;
  delete global.window;
});

describe('isElectrumQueryAvailable', () => {
  // Deliberately browser-only: on the Next server the /api/bitcoin route uses
  // utils/electrumServer instead, and bitcoinDataSource must fall through to
  // the backend rather than try to dial from a render.
  it('is false without a window', () => {
    expect(isElectrumQueryAvailable()).toBe(false);
  });

  it('is true in a browser', () => {
    global.window = {};
    expect(isElectrumQueryAvailable()).toBe(true);
  });
});

describe('runElectrumQuery timeout', () => {
  it('rejects a hung request so the caller can fall back', async () => {
    jest.useFakeTimers();
    global.fetch = hangingFetch();

    const promise = runElectrumQuery('balances', {derive_addresses: []});
    // Without the timeout this promise never settles at all. Advance well past
    // any plausible budget rather than pinning the exact value, which is a
    // tuning knob and not part of the contract.
    jest.advanceTimersByTime(120000);

    await expect(promise).rejects.toThrow(/web electrum balances timed out/);
  });

  it('passes an abort signal to fetch', async () => {
    global.fetch = jest.fn(async () => jsonResponse({ok: true, result: {}}));
    await runElectrumQuery('utxo', {});
    expect(global.fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('does not leave the abort timer pending after success', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(async () => jsonResponse({ok: true, result: {}}));

    await runElectrumQuery('utxo', {});

    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not leave the abort timer pending after failure', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    });

    await expect(runElectrumQuery('utxo', {})).rejects.toThrow('network down');
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('runElectrumQuery error reporting', () => {
  it('surfaces the server error message verbatim', async () => {
    global.fetch = jest.fn(async () =>
      jsonResponse({ok: false, error: 'electrum unreachable'}),
    );
    await expect(runElectrumQuery('balances', {})).rejects.toThrow(
      'electrum unreachable',
    );
  });

  // Load-bearing: broadcastBitcoinTransaction decides whether a broadcast
  // already landed by matching the server's own wording. A generic message
  // would make a landed broadcast look like a failure and trigger a re-send.
  it('preserves the wording broadcast idempotency matches on', async () => {
    global.fetch = jest.fn(async () =>
      jsonResponse({ok: false, error: 'bad-txns-inputs-missingorspent'}),
    );
    await expect(runElectrumQuery('broadcast', {txHex: 'ff'})).rejects.toThrow(
      'bad-txns-inputs-missingorspent',
    );
  });

  it('falls back to the status code when there is no error body', async () => {
    global.fetch = jest.fn(async () =>
      jsonResponse(null, {ok: false, status: 502}),
    );
    await expect(runElectrumQuery('balances', {})).rejects.toThrow(
      'web electrum balances failed (502)',
    );
  });
});

describe('runElectrumQuery private-key boundary', () => {
  it('keeps keys off the wire and puts them back by address', async () => {
    global.fetch = jest.fn(async () =>
      jsonResponse({
        ok: true,
        result: {
          data: {
            totalBalance: '10',
            deriveAddresses: [{address: 'addr-1', balance: '10'}],
          },
        },
      }),
    );

    const result = await runElectrumQuery('balances', {
      derive_addresses: [{address: 'addr-1', privateKey: 'secret-1'}],
    });

    const sent = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(sent.payload.derive_addresses).toEqual([{address: 'addr-1'}]);
    // ...but they must come back for downstream signing.
    expect(result.data.deriveAddresses).toEqual([
      {address: 'addr-1', balance: '10', privateKey: 'secret-1'},
    ]);
  });

  it('keeps keys off the wire and puts them back by outpoint', async () => {
    global.fetch = jest.fn(async () =>
      jsonResponse({
        ok: true,
        result: {data: [{txid: 'tx-1', vout: 0, value: 5}]},
      }),
    );

    const result = await runElectrumQuery('txdetails', {
      transaction_data: [{txid: 'tx-1', vout: 0, privateKey: 'secret-2'}],
    });

    const sent = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(sent.payload.transaction_data).toEqual([{txid: 'tx-1', vout: 0}]);
    expect(result.data).toEqual([
      {txid: 'tx-1', vout: 0, value: 5, privateKey: 'secret-2'},
    ]);
  });

  // A catch-all so a future payload shape carrying keys cannot slip through
  // unnoticed: whatever the op, nothing named privateKey may be serialized.
  it.each([
    ['balances', {derive_addresses: [{address: 'a', privateKey: 'k'}]}],
    ['txdetails', {transaction_data: [{txid: 't', vout: 0, privateKey: 'k'}]}],
    // Shapes no op sends today, and exactly the ones the previous
    // two-list-only strip would have put on the wire.
    ['broadcast', {txHex: 'ff', privateKey: 'k'}],
    ['utxo', {change: {address: 'a', privateKey: 'k'}}],
  ])('never serializes a privateKey for %s', async (op, payload) => {
    global.fetch = jest.fn(async () => jsonResponse({ok: true, result: {}}));
    await runElectrumQuery(op, payload);
    expect(global.fetch.mock.calls[0][1].body).not.toContain('privateKey');
  });
});
