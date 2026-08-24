import {NextResponse} from 'next/server';
import {
  isKnownElectrumOp,
  runElectrumQueryOnServer,
} from 'utils/electrumServer';

// Bitcoin data for the web wallet: browsers cannot open raw TCP sockets, so the
// browser posts here and utils/electrumServer runs the Electrum client over
// Node TLS. If it fails this returns 502 and the browser falls back to the
// backend providers (see bitcoinDataSource).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  let op;
  try {
    const body = await req.json();
    op = body?.op;
    if (!isKnownElectrumOp(op)) {
      return NextResponse.json(
        {ok: false, error: `unknown op: ${op}`},
        {status: 400},
      );
    }
    const result = await runElectrumQueryOnServer(op, body?.payload || {});
    return NextResponse.json({ok: true, result});
  } catch (e) {
    // The message is passed through verbatim: the browser's broadcast
    // idempotency check matches on the server's own wording.
    return NextResponse.json(
      {ok: false, error: e?.message || 'electrum error', op},
      {status: 502},
    );
  }
}
