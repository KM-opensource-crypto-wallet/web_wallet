// Extension `utils/electrumTransport`.
//
// The web build POSTs Electrum queries to its own /api/bitcoin route, which
// opens the TLS connection to the Electrum servers server-side. The extension
// has no server of its own:
//   - with ELECTRUM_BRIDGE_URL set (e.g. https://<web wallet host>/api/bitcoin)
//     it uses that same route of a deployed web wallet; the host is added to
//     host_permissions so the request is not blocked by CORS;
//   - without it, isElectrumQueryAvailable() is false and bitcoinDataSource
//     uses the DokApi backend, exactly as server-side callers do on the web.
import {reattachPrivateKeys, stripPrivateKeys} from 'utils/electrumPrivateKeys';

const ENDPOINT = process.env.EXT_ELECTRUM_BRIDGE_URL;
const REQUEST_TIMEOUT_MS = 20000;

export const isElectrumQueryAvailable = () => Boolean(ENDPOINT);

export const runElectrumQuery = async (op, payload = {}) => {
  if (!ENDPOINT) {
    throw new Error('electrum bridge not configured');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({op, payload: stripPrivateKeys(payload)}),
      signal: controller.signal,
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.ok) {
      // Verbatim: bitcoinDataSource matches the server's wording.
      throw new Error(
        json?.error || `ext electrum ${op} failed (${resp.status})`,
      );
    }
    return reattachPrivateKeys(op, payload, json.result);
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error(
        `ext electrum ${op} timed out after ${REQUEST_TIMEOUT_MS}ms`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
};
