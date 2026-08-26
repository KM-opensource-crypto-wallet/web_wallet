/**
 * The privacy boundary for the web Electrum bridge.
 *
 * Bitcoin queries run on the Next.js server, so their payloads cross a process
 * boundary — but Electrum only ever needs addresses and scripthashes. These
 * helpers strip every `privateKey` out of a request before it leaves the
 * browser and re-attach them to the response by matching on data the server
 * does echo back, so downstream signing still works.
 *
 * Pure data shaping, kept separate from the transport so it can be tested
 * without standing up a fetch.
 */

// Recurses instead of reaching into the two lists the ops happen to use today
// (derive_addresses, transaction_data): a root-level or newly nested key-bearing
// field would otherwise be serialized silently, since nothing downstream reads
// `privateKey` and so nothing would fail. Copies at every level -- the caller's
// payload must keep its keys, because reattachPrivateKeys reads them back out
// of it after the response lands.
//
// Any non-array object is recursed, exotic ones included: for a value about to
// be JSON-serialized, rebuilding it as a plain object costs nothing, and the
// alternative -- passing it through intact -- is the one that could leak.
const stripDeep = value => {
  if (Array.isArray(value)) {
    return value.map(stripDeep);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const out = {};
  Object.entries(value).forEach(([key, inner]) => {
    if (key !== 'privateKey') {
      out[key] = stripDeep(inner);
    }
  });
  return out;
};

/**
 * A deep copy of `payload` with no `privateKey` anywhere in it. The spread
 * normalizes a missing payload to `{}`, so callers always get an object.
 */
export const stripPrivateKeys = payload => stripDeep({...payload});

// Requires a truthy key: a derive address with no usable key contributes
// nothing, and mapping it would shadow nothing useful.
const keyByAddress = list => {
  const map = {};
  (Array.isArray(list) ? list : []).forEach(item => {
    if (item?.address && item?.privateKey) {
      map[item.address] = item.privateKey;
    }
  });
  return map;
};

// Accepts any *defined* key, unlike keyByAddress: a watch-only UTXO can carry
// an intentionally empty privateKey, and buildUTXO distinguishes "no key field"
// from "empty key", so that distinction has to survive the round trip.
const keyByOutpoint = list => {
  const map = {};
  (Array.isArray(list) ? list : []).forEach(item => {
    if (item?.privateKey !== undefined) {
      map[`${item.txid}:${item.vout}`] = item.privateKey;
    }
  });
  return map;
};

/**
 * Puts back the keys the server never saw. Matching is per-op because each
 * response echoes a different identifier: `balances` returns derive addresses
 * (match on `address`), `txdetails` returns UTXOs (match on `txid:vout`).
 */
export const reattachPrivateKeys = (op, original, result) => {
  if (op === 'balances' && Array.isArray(result?.data?.deriveAddresses)) {
    const byAddr = keyByAddress(original.derive_addresses);
    result.data.deriveAddresses = result.data.deriveAddresses.map(item => {
      const pk = byAddr[item?.address];
      return pk ? {...item, privateKey: pk} : item;
    });
  } else if (op === 'txdetails' && Array.isArray(result?.data)) {
    const byOutpoint = keyByOutpoint(original.transaction_data);
    result.data = result.data.map(item => {
      const pk = byOutpoint[`${item?.txid}:${item?.vout}`];
      return pk !== undefined ? {...item, privateKey: pk} : item;
    });
  }
  return result;
};
