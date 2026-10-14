import {useMemo, useRef, useState} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {useDispatch} from 'react-redux';
import {validateMnemonic} from 'bip39';
import englishMnemonics from 'bip39/src/wordlists/english.json';
import {
  setChainName,
  setPhrase,
  setPrivateKey,
} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {fetchWordsStartingWith} from 'dok-wallet-blockchain-networks/helper';
import {MAX_SUGGESTIONS, VALID_WORD_COUNTS, WORD_SET} from 'src/data/constants';
import useImportWalletByPrivateKey from './useImportWalletByPrivateKey';

// Import with a seed phrase or a private key (`initialMode`: 'seed' | 'key').
// Either way the secret goes to the store and the name step follows.
export const useImportWallet = ({initialMode = 'seed'} = {}) => {
  const [mode, setMode] = useState(initialMode);
  const [seed, setSeed] = useState('');
  const [seedError, setSeedError] = useState('');

  const router = useRouter();
  const dispatch = useDispatch();
  const path = usePathname();
  const searchParams = useSearchParams();
  const seedRef = useRef(null);

  const goToNameStep = () => {
    const base = path.startsWith('/auth') ? '/auth' : '/wallets';
    const query = searchParams?.toString() ? `?${searchParams}` : '';
    router.push(`${base}/create-wallet${query}`);
  };

  const keyImport = useImportWalletByPrivateKey({onImported: goToNameStep});

  const words = useMemo(
    () => (seed.trim() ? seed.trim().split(/\s+/) : []),
    [seed],
  );
  const isTyping = seed.length > 0 && !/\s$/.test(seed);
  const currentWord = isTyping ? words[words.length - 1] : '';
  const suggestions =
    currentWord.length >= 2 && !WORD_SET.has(currentWord)
      ? fetchWordsStartingWith(englishMnemonics, currentWord).slice(
          0,
          MAX_SUGGESTIONS,
        )
      : [];
  const countOk = VALID_WORD_COUNTS.includes(words.length);
  const isSeed = mode === 'seed';
  const canImport = isSeed ? countOk : keyImport.canImportKey;
  const countLabel =
    words.length === 0
      ? '0 words'
      : countOk
        ? `${words.length} words ✓`
        : `${words.length} ${words.length === 1 ? 'word' : 'words'} — needs 12, 15, 18, 21 or 24`;
  // 'ok' | 'bad' | '' — how the word count and the seed box are tinted.
  const countStatus = words.length === 0 ? '' : countOk ? 'ok' : 'bad';
  const seedBoxStatus =
    seedError || (words.length && !countOk && !isTyping)
      ? 'bad'
      : countOk
        ? 'ok'
        : '';

  const onSeedChange = e => {
    setSeed(e.target.value.toLowerCase());
    setSeedError('');
  };

  const pickSuggestion = word => {
    const parts = seed.split(/\s+/);
    parts[parts.length - 1] = word;
    setSeed(`${parts.join(' ')} `);
    setSeedError('');
    seedRef.current?.focus();
  };

  const onPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSeed(text.toLowerCase().trim().split(/\s+/).join(' '));
        setSeedError('');
      }
    } catch {
      // Clipboard read was refused; the user can still paste with keys.
      seedRef.current?.focus();
    }
  };

  const onSubmit = async e => {
    e.preventDefault();
    if (!canImport || keyImport.isSubmitting) {
      return;
    }
    if (!isSeed) {
      await keyImport.submitPrivateKey();
      return;
    }
    const phrase = words.join(' ');
    if (!validateMnemonic(phrase)) {
      setSeedError(
        'This is not a valid seed phrase. Check the words and their order.',
      );
      return;
    }
    dispatch(setPhrase(phrase));
    dispatch(setPrivateKey(null));
    dispatch(setChainName(null));
    goToNameStep();
  };

  return {
    isSeed,
    selectSeedMode: () => setMode('seed'),
    selectKeyMode: () => setMode('key'),
    seed,
    seedRef,
    seedError,
    onSeedChange,
    words,
    isTyping,
    suggestions,
    pickSuggestion,
    onPaste,
    countLabel,
    countStatus,
    seedBoxStatus,
    ...keyImport,
    canImport,
    onSubmit,
  };
};

export default useImportWallet;
