// Client-side copy of the backend utils/supportChat/secretDetector.js. Keep the
// rules identical: both copies run against __fixtures__/secret-cases.json.
import englishMnemonics from 'bip39/src/wordlists/english.json';
import {Keypair} from '@solana/web3.js';

const WORDS = new Set(englishMnemonics);

const WIF = /\b[5KL9c][1-9A-HJ-NP-Za-km-z]{50,51}\b/;
const XPRV = /\b[xyztuvYZUV]prv[1-9A-HJ-NP-Za-km-z]{100,112}\b/;
const SOLANA = /\b[1-9A-HJ-NP-Za-km-z]{87,88}\b/g;
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const HEX = /\b(?:0x)?[0-9a-fA-F]{64}\b/g;
const KEY_WORD = /key|private|secret|priv/i;
const WINDOW = 12;
const MIN_HITS = 11;
const HEX_CONTEXT = 40;

const INVISIBLE = new RegExp('[\\u200B-\\u200D\\uFEFF]', 'g');
const normalise = (text, replacement) =>
  text.normalize('NFKC').replace(INVISIBLE, replacement);

const isMnemonic = text => {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t && !/^\d+$/.test(t));
  if (tokens.length < MIN_HITS) return false;
  const flags = tokens.map(t => (WORDS.has(t) ? 1 : 0));
  if (tokens.length < WINDOW) return flags.every(Boolean);
  let hits = flags.slice(0, WINDOW).reduce((a, b) => a + b, 0);
  if (hits >= MIN_HITS) return true;
  for (let i = WINDOW; i < flags.length; i++) {
    hits += flags[i] - flags[i - WINDOW];
    if (hits >= MIN_HITS) return true;
  }
  return false;
};

const hasKeyedHex = text => {
  for (const m of text.matchAll(HEX)) {
    const before = text.slice(Math.max(0, m.index - HEX_CONTEXT), m.index);
    const after = text.slice(
      m.index + m[0].length,
      m.index + m[0].length + HEX_CONTEXT,
    );
    if (KEY_WORD.test(before) || KEY_WORD.test(after)) return true;
  }
  return false;
};

const decodeBase58 = text => {
  const bytes = [];
  for (const char of text) {
    let carry = BASE58.indexOf(char);
    if (carry < 0) return null;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of text) {
    if (char !== '1') break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
};

// A Solana secret key is 64 bytes: the ed25519 seed, then its own public key.
// A transaction signature has the same length, but its second half is not the
// public key of its first half, so only a real key matches.
const isSolanaKey = token => {
  const bytes = decodeBase58(token);
  if (!bytes || bytes.length !== 64) return false;
  try {
    Keypair.fromSecretKey(bytes);
    return true;
  } catch {
    return false;
  }
};

const hasSolanaKey = text => {
  for (const m of text.matchAll(SOLANA)) {
    if (isSolanaKey(m[0])) return true;
  }
  return false;
};

export const findSecret = input => {
  const text = normalise(input, '');
  if (isMnemonic(text) || isMnemonic(normalise(input, ' '))) return 'mnemonic';
  if (WIF.test(text)) return 'wif';
  if (XPRV.test(text)) return 'xprv';
  if (hasSolanaKey(text)) return 'solana';
  if (hasKeyedHex(text)) return 'hex';
  return null;
};
