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

const stripKeyFromItem = item =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? (({privateKey, ...rest}) => rest)(item)
    : item;

/** A shallow copy of `payload` with no `privateKey` anywhere in it. */
export const stripPrivateKeys = payload => {
  const clone = {...payload};
  if (Array.isArray(clone.derive_addresses)) {
    clone.derive_addresses = clone.derive_addresses.map(stripKeyFromItem);
  }
  if (Array.isArray(clone.transaction_data)) {
    clone.transaction_data = clone.transaction_data.map(stripKeyFromItem);
  }
  return clone;
};

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
