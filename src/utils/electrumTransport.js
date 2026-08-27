import {reattachPrivateKeys, stripPrivateKeys} from 'utils/electrumPrivateKeys';

/**
 * Electrum transport for the browser — the web half of the
 * `utils/electrumTransport` seam that `service/bitcoinDataSource` imports.
 *
 * Browsers cannot open raw TCP sockets, so a query is an HTTP round trip to
 * /api/bitcoin, which runs the real Electrum client server-side (see
 * utils/electrumServer). Private keys are stripped before the request leaves
 * and re-attached to the response.
 *
 * Deliberately browser-only. This module is in the client bundle graph
 * (bitcoinDataSource -> BitcoinChain -> 'use client' pages), so it must never
 * reach for `node:tls`: webpack rejects `node:`-scheme requests in a
 * browser-target build even inside an untaken branch. Server-side callers get
 * `false` from isElectrumQueryAvailable() and fall through to the backend,
 * which is exactly what they do today.
 */

const ENDPOINT = '/api/bitcoin';

// fetch has no default timeout, so a hung bridge request would leave the caller
// awaiting forever — and the DokApi fallback in bitcoinDataSource only runs on a
// rejection, so it would never get its turn. Same budget as
// customFetchWithTimeout in the submodule's helper.
const REQUEST_TIMEOUT_MS = 20000;

export const isElectrumQueryAvailable = () => typeof window !== 'undefined';

export const runElectrumQuery = async (op, payload = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // The signal bounds the body read as well as the request itself.
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({op, payload: stripPrivateKeys(payload)}),
      signal: controller.signal,
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.ok) {
      // json.error verbatim, never a generic message: broadcast idempotency in
      // bitcoinDataSource matches the server's own wording ("already known",
      // "inputs missing or spent") to tell a landed broadcast from a failed one.
      throw new Error(
        json?.error || `web electrum ${op} failed (${resp.status})`,
      );
    }
    return reattachPrivateKeys(op, payload, json.result);
  } catch (e) {
    // An abort surfaces as a bare AbortError ("the user aborted a request"),
    // which is both wrong and useless in the caller's fallback warning.
    if (controller.signal.aborted) {
      throw new Error(
        `web electrum ${op} timed out after ${REQUEST_TIMEOUT_MS}ms`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
};
