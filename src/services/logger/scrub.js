// Pure redaction helpers shared by every Sentry hook (events, breadcrumbs,
// logs). This is a non-custodial wallet: a leaked mnemonic or private key is
// unrecoverable, so redaction errs on the side of over-matching. Public data
// support genuinely needs (a tx hash) is re-allowed per call via `allowKeys`.

export const MAX_STRING_LENGTH = 1024;
const MAX_DEPTH = 5;

// JSON-ish `"privateKey":"..."` pairs inside stringified objects, e.g. the
// `console.error('...', JSON.stringify(axiosError))` sites in the submodule.
const JSON_SENSITIVE_PAIR_RE =
  /"(phrase|mnemonic|seed|seedPhrase|privateKey|private_key|privKey|extendedPrivateKey|xprv|wif|secret|password|passwd|pin|salt|authorization|accessToken|access_token|refreshToken)"\s*:\s*"(?:[^"\\]|\\.)*"/gi;
// BIP32 / SLIP-132 extended private keys: mainnet xprv/yprv/zprv, testnet
// tprv/uprv/vprv, plus the multisig Yprv/Zprv/Uprv/Vprv variants.
const XPRV_RE = /\b[xyztuvYZUV]prv[1-9A-HJ-NP-Za-km-z]{100,112}\b/g;
// Bitcoin WIF, compressed and uncompressed: mainnet 5/K/L, testnet 9/c.
const WIF_RE = /\b[5KL9c][1-9A-HJ-NP-Za-km-z]{50,51}\b/g;
// 32-byte hex: EVM/Solana-style private keys. Also matches tx hashes, which is
// why `tx_hash` is allow-listed as a structured attribute instead.
const HEX64_RE = /\b(?:0x)?[0-9a-fA-F]{64}\b/g;
// 12-24 lowercase words of 3-8 letters: the BIP39 word shape. Lowercase-only
// keeps prose ("Error in fetch ...") from matching.
const MNEMONIC_RE = /\b(?:[a-z]{3,8}\s+){11,23}[a-z]{3,8}\b/g;

const SENSITIVE_KEY_RE =
  /phrase|mnemonic|seed|privatekey|private_key|privkey|xprv|wif|secret|password|passwd|salt|authorization|accesstoken|access_token|refreshtoken|^pin$|hash$/i;
// Axios error shape: request/response bodies and headers never leave the device.
const AXIOS_KEYS = new Set(['data', 'body', 'headers', 'config', 'request']);

export const scrubString = value => {
  if (typeof value !== 'string') {
    return value;
  }
  let out = value
    .replace(JSON_SENSITIVE_PAIR_RE, '"$1":"[REDACTED]"')
    .replace(XPRV_RE, '[REDACTED_KEY]')
    .replace(WIF_RE, '[REDACTED_KEY]')
    .replace(HEX64_RE, '[REDACTED_HEX]')
    .replace(MNEMONIC_RE, '[REDACTED_MNEMONIC]');
  if (out.length > MAX_STRING_LENGTH) {
    out = `${out.slice(0, MAX_STRING_LENGTH)}…[truncated]`;
  }
  return out;
};

export const scrubObject = (value, options = {}, depth = 0) => {
  const allowKeys = options.allowKeys || [];
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return scrubString(value);
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_DEPTH) {
    return '[depth limit]';
  }
  if (Array.isArray(value)) {
    return value.map(item => scrubObject(item, options, depth + 1));
  }
  if (value instanceof Error) {
    return scrubString(value.message);
  }
  const out = {};
  for (const key of Object.keys(value)) {
    if (allowKeys.includes(key)) {
      out[key] = value[key];
      continue;
    }
    if (AXIOS_KEYS.has(key) || SENSITIVE_KEY_RE.test(key)) {
      continue;
    }
    out[key] = scrubObject(value[key], options, depth + 1);
  }
  return out;
};

export const stripQuery = url => {
  if (typeof url !== 'string') {
    return url;
  }
  return url.split(/[?#]/)[0];
};
