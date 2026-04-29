// Server-side RPC proxy — eliminates browser CORS preflight for blockchain nodes.
// The browser makes a same-origin POST here; this server forwards to the real RPC
// with no CORS restrictions and a tight 8-second timeout per URL.

const ALLOWED_BASE_DOMAINS = new Set([
  'publicnode.com',
  'drpc.org',
  'blastapi.io',
  'llamarpc.com',
  'nodies.app',
  'omniatech.io',
  'nodereal.io',
  'ankr.com',
  'alchemy.com',
  'quiknode.pro',
  'trongrid.io',
  'toncenter.com',
  'stakeworld.io',
  'solana.com',
  'node.glif.io',
  'chainup.net',
  'inkonchain.com',
  'etcdesktop.com',
  'etcinscribe.com',
  'rivet.link',
  'ethereumpow.org',
  'ecadinfra.com',
  'stellar.org',
  'mevblocker.io',
  'bnbchain.org',
  'sei-apis.com',
  'kava.io',
  'viction.xyz',
  'chiadochain.net',
  'etc-network.info',
  'avax-test.network',
  'base.org',
  'optimism.io',
  'linea.build',
  'infura.io',
  'xrpl.org',
  'cosmos.directory',
]);

function isAllowedHost(hostname) {
  if (ALLOWED_BASE_DOMAINS.has(hostname)) return true;
  return [...ALLOWED_BASE_DOMAINS].some(domain =>
    hostname.endsWith('.' + domain),
  );
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({error: 'Invalid request body'}, {status: 400});
  }

  const {targetUrl, payload} = body;

  if (!targetUrl || typeof targetUrl !== 'string') {
    return Response.json({error: 'Missing targetUrl'}, {status: 400});
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return Response.json({error: 'Invalid URL'}, {status: 400});
  }

  if (!isAllowedHost(parsedUrl.hostname)) {
    return Response.json({error: 'Domain not allowed'}, {status: 403});
  }

  try {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    const data = await resp.json();
    return Response.json(data);
  } catch (e) {
    const id = payload?.id ?? null;
    return Response.json(
      {
        jsonrpc: '2.0',
        id,
        error: {code: -32603, message: 'RPC proxy upstream failed'},
      },
      {status: 200},
    );
  }
}
