// Intercepts all browser JSON-RPC fetch calls and routes them through the
// Next.js server-side proxy (/api/rpc-proxy). This eliminates CORS preflight
// for blockchain nodes and reduces the effective timeout from 45s to ~10s,
// making coin sync 5-10x faster in the browser vs hitting nodes directly.

let interceptorInstalled = false;

function isJsonRpcBody(bodyStr) {
  try {
    const body = JSON.parse(bodyStr || '{}');
    if (Array.isArray(body)) {
      return body.length > 0 && body.every(el => el?.jsonrpc === '2.0');
    }
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

function headersToObject(headers) {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  return {...headers};
}

export function initRPCProxyInterceptor() {
  if (typeof window === 'undefined') return;
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function rpcProxyFetch(input, init) {
    let url;
    let method;
    let bodyStr;
    let originalHeaders;

    if (input instanceof Request) {
      url = input.url;
      method = input.method;
      originalHeaders = headersToObject(input.headers);
      // Only read body for POST (clone preserves the original for non-proxied passthrough)
      if (method.toUpperCase() === 'POST') {
        try {
          bodyStr = await input.clone().text();
        } catch {
          bodyStr = '';
        }
      }
    } else {
      url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : String(input);
      method = init?.method || 'GET';
      bodyStr = typeof init?.body === 'string' ? init.body : '';
      originalHeaders = headersToObject(init?.headers);
    }

    if (
      url &&
      !isSameOrigin(url) &&
      url.startsWith('http') &&
      method.toUpperCase() === 'POST' &&
      isJsonRpcBody(bodyStr)
    ) {
      let payload;
      try {
        payload = JSON.parse(bodyStr || '{}');
      } catch {
        payload = {};
      }

      // Allowlist: only forward headers that RPC endpoints legitimately need.
      // Blocklist approaches risk forwarding cookies/session tokens.
      const FORWARDED_HEADER_ALLOWLIST = new Set([
        'authorization',
        'x-api-key',
        'x-custom-headers',
      ]);
      const forwardedHeaders = Object.fromEntries(
        Object.entries(originalHeaders)
          .filter(([k]) => FORWARDED_HEADER_ALLOWLIST.has(k.toLowerCase()))
          .map(([k, v]) => [k.toLowerCase(), v]),
      );

      return originalFetch('/api/rpc-proxy', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          targetUrl: url,
          payload,
          forwardedHeaders,
        }),
        // 12s browser→proxy timeout; proxy itself has an 8s upstream timeout.
        // Both are far below ethers.js's 45s, cutting worst-case per-URL wait dramatically.
        signal: AbortSignal.timeout(12000),
      });
    }

    return originalFetch(input, init);
  };
}
