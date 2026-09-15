/**
 * The server-side Electrum client is pinned on globalThis so Next dev HMR does
 * not leave two live sockets. That pin must not outlive its inputs: when the
 * module is re-evaluated with a different server list (IS_SANDBOX flipped,
 * servers edited) the stale client has to be replaced, or a testnet wallet
 * keeps querying the mainnet socket the process started with.
 */
jest.mock('server-only', () => ({}), {virtual: true});

const CLIENT_KEY = '__dokElectrumServerClient';

const fakeSocket = () => ({
  destroy: jest.fn(),
  on: jest.fn(),
  write: jest.fn(),
});

// Loads a fresh copy of utils/electrumServer with the given sandbox flag and
// returns the client it resolves for a query. `ElectrumClient` is replaced by
// a minimal fake that records its constructor options, so no socket opens.
const loadWithSandbox = isSandbox => {
  let mod;
  jest.isolateModules(() => {
    jest.doMock('node:tls', () => ({connect: jest.fn()}));
    jest.doMock('dok-wallet-blockchain-networks/config/config', () => ({
      IS_SANDBOX: isSandbox,
    }));
    jest.doMock('dok-wallet-blockchain-networks/service/electrum', () => {
      class FakeElectrumClient {
        constructor({servers, socketFactory}) {
          this.servers = servers;
          this.socketFactory = socketFactory;
          this.socket = null;
        }
      }
      return {
        ElectrumClient: FakeElectrumClient,
        ELECTRUM_QUERIES: {
          whoami: client => client,
        },
      };
    });
    mod = require('./electrumServer');
  });
  return mod;
};

const hostsOf = client => client.servers.map(server => server.host);

describe('electrumServer client pin', () => {
  afterEach(() => {
    delete globalThis[CLIENT_KEY];
    jest.resetModules();
  });

  it('reuses the pinned client while the server list is unchanged', async () => {
    const first = loadWithSandbox(false);
    const clientA = await first.runElectrumQueryOnServer('whoami');
    const second = loadWithSandbox(false);
    const clientB = await second.runElectrumQueryOnServer('whoami');
    expect(clientB).toBe(clientA);
    expect(hostsOf(clientA)).toEqual([
      'electrum.kimlwallet.com',
      'electrum1.bluewallet.io',
    ]);
  });

  it('replaces a pinned client built from a different server list', async () => {
    const mainnet = loadWithSandbox(false);
    const stale = await mainnet.runElectrumQueryOnServer('whoami');
    stale.socket = fakeSocket();

    const testnet = loadWithSandbox(true);
    const fresh = await testnet.runElectrumQueryOnServer('whoami');

    expect(fresh).not.toBe(stale);
    expect(hostsOf(fresh)).toEqual([
      'testnet.aranguren.org',
      'electrum.blockstream.info',
    ]);
    expect(stale.socket.destroy).toHaveBeenCalledTimes(1);
    expect(globalThis[CLIENT_KEY]).toBe(fresh);
  });

  it('rejects unknown ops before touching the client', () => {
    const mod = loadWithSandbox(true);
    expect(mod.isKnownElectrumOp('whoami')).toBe(true);
    expect(mod.isKnownElectrumOp('nope')).toBe(false);
    expect(() => mod.runElectrumQueryOnServer('nope')).toThrow(
      'unknown electrum op: nope',
    );
  });
});
