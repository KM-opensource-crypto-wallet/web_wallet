import tls from 'node:tls';
import {NextResponse} from 'next/server';
import {
  getElectrumClient,
  electrumFetchBitcoinBalances,
  electrumFetchBitcoinUTXO,
  electrumFetchBitcoinTransactionDetails,
  electrumFetchBitcoinTransactions,
  electrumGetTransaction,
  electrumBroadcastTransaction,
  electrumGetFeeRate,
} from 'dok-wallet-blockchain-networks/service/electrum';

// Bitcoin data for the web wallet (option A): browsers cannot open raw TCP
// sockets, so the Electrum client runs here, server-side, over Node TLS.
// Server order is own Fulcrum first, then BlueWallet. If both fail the route
// returns 502 and the browser falls back to Blockchair (see bitcoinDataSource).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEB_ELECTRUM_SERVERS = [
  {host: 'electrum.kimlwallet.com', port: 50002},
  {host: 'electrum1.bluewallet.io', port: 443},
];

// Electrum servers use self-signed certificates (BlueWallet accepts them the
// same way), so certificate validity is not checked.
const nodeTlsSocketFactory = ({host, port}, onConnect) =>
  tls.connect({host, port, rejectUnauthorized: false}, onConnect);

// Point the shared Electrum singleton at Node TLS + the web server order.
// Done once per server process, before any request opens a socket.
let configured = false;
const ensureClient = () => {
  const client = getElectrumClient();
  if (!configured) {
    client.servers = WEB_ELECTRUM_SERVERS;
    client.socketFactory = nodeTlsSocketFactory;
    client.serverIndex = 0;
    configured = true;
  }
  return client;
};

const HANDLERS = {
  balances: electrumFetchBitcoinBalances,
  utxo: electrumFetchBitcoinUTXO,
  txdetails: electrumFetchBitcoinTransactionDetails,
  transactions: electrumFetchBitcoinTransactions,
  transaction: electrumGetTransaction,
  broadcast: electrumBroadcastTransaction,
  feerate: electrumGetFeeRate,
};

export async function POST(req) {
  let op;
  try {
    const body = await req.json();
    op = body?.op;
    const payload = body?.payload || {};
    const handler = HANDLERS[op];
    if (!handler) {
      return NextResponse.json(
        {ok: false, error: `unknown op: ${op}`},
        {status: 400},
      );
    }
    ensureClient();
    const result = await handler(payload);
    return NextResponse.json({ok: true, result});
  } catch (e) {
    // Non-2xx tells the browser to fall back to Blockchair.
    return NextResponse.json(
      {ok: false, error: e?.message || 'electrum error', op},
      {status: 502},
    );
  }
}
