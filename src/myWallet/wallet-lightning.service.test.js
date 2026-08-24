// A fake SDK per mnemonic, so which instance a caller received is directly
// observable through the balance getLightningBalance returns.
const balanceFor = mnemonic => `${mnemonic}-balance`;

// `build` is what actually opens a connection, so it -- not SdkBuilder.new --
// is the call the assertions count.
const build = jest.fn();

jest.mock('@breeztech/breez-sdk-spark/web', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
  defaultConfig: jest.fn(() => ({})),
  SdkBuilder: {
    new: jest.fn((config, seed) => ({
      withDefaultStorage: async () => ({
        build: () => build(seed.mnemonic),
      }),
    })),
  },
}));

jest.mock('dok-wallet-blockchain-networks/config/config', () => ({
  IS_SANDBOX: false,
}));

jest.mock('dok-wallet-blockchain-networks/helper', () => ({
  convertToSmallAmount: jest.fn(),
  parseBalance: jest.fn(value => value),
}));

// The service keeps connection state at module scope, so every test needs a
// fresh copy -- and the breez mock must come from the SAME fresh registry as
// the service, or the assertions would watch a different jest.fn.
const load = () => {
  jest.resetModules();
  build.mockReset();
  const {getLightningBalance} = require('myWallet/wallet-lightning.service');
  // `gate` lets a test hold connects open (to force real overlap) or reject.
  const state = {gate: null};
  build.mockImplementation(async mnemonic => {
    if (state.gate) {
      await state.gate(mnemonic);
    }
    return {getInfo: async () => ({balanceSats: balanceFor(mnemonic)})};
  });
  return {getBalance: getLightningBalance, connect: build, state};
};

const openGate = () => {
  let release;
  const promise = new Promise(resolve => {
    release = resolve;
  });
  return {promise, release};
};

describe('connectToSdk wallet isolation', () => {
  it('gives each wallet its own SDK when two connect concurrently', async () => {
    const {getBalance, connect, state} = load();
    const gate = openGate();
    state.gate = () => gate.promise;

    const both = Promise.all([getBalance('wallet-a'), getBalance('wallet-b')]);
    gate.release();
    const [balanceA, balanceB] = await both;

    // Before the fix, wallet-b was handed wallet-a's in-flight promise and
    // reported wallet-a's balance.
    expect(balanceA).toBe(balanceFor('wallet-a'));
    expect(balanceB).toBe(balanceFor('wallet-b'));
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('reuses a cached instance after another wallet fails to connect', async () => {
    const {getBalance, connect, state} = load();
    expect(await getBalance('wallet-a')).toBe(balanceFor('wallet-a'));
    expect(connect).toHaveBeenCalledTimes(1);

    state.gate = mnemonic =>
      mnemonic === 'wallet-b'
        ? Promise.reject(new Error('connect failed'))
        : Promise.resolve();
    await getBalance('wallet-b');
    expect(connect).toHaveBeenCalledTimes(2);

    // Before the fix, wallet-b's failure nulled the shared instance and this
    // call opened a SECOND live connection for wallet-a.
    state.gate = null;
    expect(await getBalance('wallet-a')).toBe(balanceFor('wallet-a'));
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('collapses concurrent connects for the same wallet into one', async () => {
    const {getBalance, connect, state} = load();
    const gate = openGate();
    state.gate = () => gate.promise;

    const both = Promise.all([getBalance('wallet-a'), getBalance('wallet-a')]);
    gate.release();
    const [first, second] = await both;

    expect(first).toBe(balanceFor('wallet-a'));
    expect(second).toBe(balanceFor('wallet-a'));
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect a wallet that is already connected', async () => {
    const {getBalance, connect} = load();
    await getBalance('wallet-a');
    await getBalance('wallet-a');
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('retries after a failed connect instead of caching the failure', async () => {
    const {getBalance, connect, state} = load();
    state.gate = () => Promise.reject(new Error('connect failed'));
    await getBalance('wallet-a');
    expect(connect).toHaveBeenCalledTimes(1);

    state.gate = null;
    expect(await getBalance('wallet-a')).toBe(balanceFor('wallet-a'));
    expect(connect).toHaveBeenCalledTimes(2);
  });

  describe('with no phrase', () => {
    it('falls back to the most recently connected wallet', async () => {
      const {getBalance, connect} = load();
      await getBalance('wallet-a');
      connect.mockClear();

      expect(await getBalance(undefined)).toBe(balanceFor('wallet-a'));
      expect(connect).not.toHaveBeenCalled();
    });

    it('resolves without throwing when nothing is connected yet', async () => {
      const {getBalance, connect} = load();
      expect(await getBalance(undefined)).toBeUndefined();
      expect(connect).not.toHaveBeenCalled();
    });
  });
});
