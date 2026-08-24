import 'server-only';
import tls from 'node:tls';
import {IS_SANDBOX} from 'dok-wallet-blockchain-networks/config/config';
import {ELECTRUM_SERVER} from 'dok-wallet-blockchain-networks/config/electrumServers';
import {
  ELECTRUM_QUERIES,
  ElectrumClient,
} from 'dok-wallet-blockchain-networks/service/electrum';

/**
 * Server-side Electrum client for the /api/bitcoin route.
 *
 * The browser cannot dial TCP, so it posts to that route and this module does
 * the talking over Node TLS. `import 'server-only'` makes including it in a
 * client bundle a build error rather than a comment — which matters because
 * `node:tls` cannot be resolved for a browser target at all.
 *
 * Note the socket here is process-scoped and shared by every request, unlike
 * the browser transport's stateless HTTP calls. That is why the two live in
 * separate modules instead of behind one `typeof window` branch.
 */

// Only the two hosts our server reaches reliably; datacenter egress to
// arbitrary high ports is not the same constraint a phone has, so this list is
// deliberately shorter than mobile's.
const SERVERS = IS_SANDBOX
  ? [ELECTRUM_SERVER.testnetBlockstream, ELECTRUM_SERVER.testnetAranguren]
  : [ELECTRUM_SERVER.own, ELECTRUM_SERVER.bluewallet];

// Electrum servers use self-signed certificates (BlueWallet, Electrum desktop
// and Sparrow all accept them the same way; the protocol has no CA trust model
// for these public servers).
const socketFactory = ({host, port}, onConnect) =>
  tls.connect({host, port, rejectUnauthorized: false}, onConnect);

// Pinned on globalThis, not a module-scope `let`: Next dev HMR and server
// chunk splitting can otherwise evaluate this module twice and leave two live
// sockets. Lazy, so importing the module never opens a connection.
const CLIENT_KEY = '__dokElectrumServerClient';
const getClient = () => {
  if (!globalThis[CLIENT_KEY]) {
    globalThis[CLIENT_KEY] = new ElectrumClient({
      servers: SERVERS,
      socketFactory,
    });
  }
  return globalThis[CLIENT_KEY];
};

export const isKnownElectrumOp = op => !!ELECTRUM_QUERIES[op];

export const runElectrumQueryOnServer = (op, payload = {}) => {
  const query = ELECTRUM_QUERIES[op];
  if (!query) {
    throw new Error(`unknown electrum op: ${op}`);
  }
  return query(getClient(), payload);
};
