// Client-side copy of the backend utils/supportChat/secretDetector.js. Keep the
// rules identical: both copies run against __fixtures__/secret-cases.json.
import englishMnemonics from 'bip39/src/wordlists/english.json';

const WORDS = new Set(englishMnemonics);

const WIF = /\b[5KL9c][1-9A-HJ-NP-Za-km-z]{50,51}\b/;
const XPRV = /\b[xyztuvYZUV]prv[1-9A-HJ-NP-Za-km-z]{100,112}\b/;
const SOLANA = /\b[1-9A-HJ-NP-Za-km-z]{87,88}\b/;
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

export const findSecret = input => {
  const text = normalise(input, '');
  if (isMnemonic(text) || isMnemonic(normalise(input, ' '))) return 'mnemonic';
  if (WIF.test(text)) return 'wif';
  if (XPRV.test(text)) return 'xprv';
  if (SOLANA.test(text)) return 'solana';
  if (hasKeyedHex(text)) return 'hex';
  return null;
};
