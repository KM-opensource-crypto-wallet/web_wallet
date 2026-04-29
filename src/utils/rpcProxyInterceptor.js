// Intercepts all browser JSON-RPC fetch calls and routes them through the
// Next.js server-side proxy (/api/rpc-proxy). This eliminates CORS preflight
// for blockchain nodes and reduces the effective timeout from 45s to ~10s,
// making coin sync 5-10x faster in the browser vs hitting nodes directly.

let interceptorInstalled = false;

function isJsonRpcCall(url, init) {
  if (typeof url !== 'string') return false;
  if (!url.startsWith('http')) return false;
  if (init?.method?.toUpperCase() !== 'POST') return false;
  try {
    const body = JSON.parse(init?.body || '{}');
    return body.jsonrpc === '2.0';
  } catch {
    return false;
  }
}

function isSameOrigin(url) {
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function initRPCProxyInterceptor() {
  if (typeof window === 'undefined') return;
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function rpcProxyFetch(input, init) {
    let url;
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
    }

    if (url && !isSameOrigin(url) && isJsonRpcCall(url, init)) {
      let payload;
      try {
        payload = JSON.parse(init?.body || '{}');
      } catch {
        payload = {};
      }

      return originalFetch('/api/rpc-proxy', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({targetUrl: url, payload}),
        // 12s browser→proxy timeout; proxy itself has an 8s upstream timeout.
        // Both are far below ethers.js's 45s, cutting worst-case per-URL wait dramatically.
        signal: AbortSignal.timeout(12000),
      });
    }

    return originalFetch(input, init);
  };
}
