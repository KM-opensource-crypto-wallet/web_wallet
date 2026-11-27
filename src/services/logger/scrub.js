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
// The same pairs inside JSON that was stringified again (`\"privateKey\":\"…\"`,
// up to five escape levels). The value's closing quote has n backslashes
// before it (n captured from the key, `\1`). Each stringify doubles a
// backslash, so inside the value every escape has exactly one shape:
//   [^\\"]          an ordinary character
//   \1\1\\\\        an escaped backslash  (2n+2 backslashes)
//   \1\1\\"         an escaped quote      (2n+1 backslashes and a quote)
//   \1\\(?![\\"])   another escape such as \n or \uXXXX (n+1 backslashes)
// Only one shape fits any position, so the scan never backtracks through
// alternatives and stays linear, even on unterminated input; the opening run
// is capped at 31 backslashes for the same reason.
const ESCAPED_JSON_SENSITIVE_PAIR_RE =
  /(\\{1,31})"(phrase|mnemonic|seed|seedPhrase|privateKey|private_key|privKey|extendedPrivateKey|xprv|wif|secret|password|passwd|pin|salt|authorization|accessToken|access_token|refreshToken)\1"\s*:\s*\1"(?:[^\\"]|\1\1\\\\|\1\1\\"|\1\\(?![\\"]))*?\1"/gi;
// BIP32 / SLIP-132 extended private keys: mainnet xprv/yprv/zprv, testnet
// tprv/uprv/vprv, plus the multisig Yprv/Zprv/Uprv/Vprv variants.
const XPRV_RE = /\b[xyztuvYZUV]prv[1-9A-HJ-NP-Za-km-z]{100,112}\b/g;
// Solana 64-byte secret keys in base58 (also matches tx signatures).
const BASE58_SECRET_RE = /\b[1-9A-HJ-NP-Za-km-z]{85,88}\b/g;
// Stellar secret seeds: StrKey "S" + 55 base32 characters.
const STELLAR_SEED_RE = /\bS[A-Z2-7]{55}\b/g;
// Bitcoin WIF, compressed and uncompressed: mainnet 5/K/L, testnet 9/c.
const WIF_RE = /\b[5KL9c][1-9A-HJ-NP-Za-km-z]{50,51}\b/g;
// 32- and 64-byte hex: EVM/Solana-style private keys and expanded ed25519
// keys. Also matches tx hashes, which is why `tx_hash` is allow-listed as a
// structured attribute instead.
const HEX64_RE = /\b(?:0x)?[0-9a-fA-F]{64}(?:[0-9a-fA-F]{64})?\b/g;
// 12-24 words of 3-8 letters: the BIP39 word shape, separated by spaces or
// commas. Only the first word may start with a capital; the rest must be
// lowercase, which keeps prose ("Error in fetch ...") from matching.
const MNEMONIC_RE =
  /\b[a-zA-Z][a-z]{2,7}(?:(?:\s*,\s*|\s+)[a-z]{3,8}){11,23}\b/g;

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
    .replace(ESCAPED_JSON_SENSITIVE_PAIR_RE, '$1"$2$1":$1"[REDACTED]$1"')
    .replace(XPRV_RE, '[REDACTED_KEY]')
    .replace(BASE58_SECRET_RE, '[REDACTED_KEY]')
    .replace(STELLAR_SEED_RE, '[REDACTED_KEY]')
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
