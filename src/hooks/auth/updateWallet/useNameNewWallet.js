import {useEffect, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {toast} from 'react-toastify';
import {walletRoutes} from 'utils/routes';
import {skipLockOnNextLoad} from 'utils/lockScreen';
import {
  selectAllWalletName,
  selectCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  createWallet,
  refreshCoins,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  getChainName,
  getPhrase,
  getPrivateKey,
} from 'dok-wallet-blockchain-networks/redux/extraData/extraSelectors';
import {
  setChainName,
  setPhrase,
  setPrivateKey,
} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {resetPaymentUrl} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';

export const MAX_LENGTH = 24;
const SUGGESTIONS = ['Savings', 'Trading', 'DeFi', 'Cold Storage'];

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// First free "Main Wallet" / "Wallet N", the name a new wallet starts with.
const defaultName = names => {
  if (names.length === 0) {
    return 'Main Wallet';
  }
  let index = names.length + 1;
  while (names.some(name => sameName(name, `Wallet ${index}`))) {
    index += 1;
  }
  return `Wallet ${index}`;
};

// Name step for a new wallet, after "Create" or after an import (the seed
// phrase or private key is then already in the store).
export const useNameNewWallet = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const phrase = useSelector(getPhrase);
  const privateKey = useSelector(getPrivateKey);
  const chain_name = useSelector(getChainName);
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const allWalletName = useSelector(selectAllWalletName, shallowEqual);
  const isImport = !!(phrase || privateKey);

  const [name, setName] = useState(() => defaultName(allWalletName));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const trimmed = name.trim();
  const isDuplicate =
    trimmed.length > 0 && allWalletName.some(item => sameName(item, trimmed));
  const canSubmit = trimmed.length > 0 && !isDuplicate && !isSubmitting;
  const suggestions = SUGGESTIONS.filter(
    item =>
      !sameName(item, trimmed) &&
      !allWalletName.some(existing => sameName(existing, item)),
  );

  const onNameChange = e => setName(e.target.value);

  const clearName = () => {
    setName('');
    inputRef.current?.focus();
  };

  const goBack = () => router.back();

  const handleSubmit = async e => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      dispatch(resetPaymentUrl());
      const created = await dispatch(
        createWallet({
          walletName: trimmed,
          phrase,
          privateKey,
          chain_name,
        }),
      ).unwrap();
      // The reducer makes the new wallet current, but this closure still
      // holds the previous id; land on the wallet that was just created.
      const newWalletClientId =
        created?.newStoreWallet?.clientId || currentWalletClientId;
      const redirectRoute = searchParams?.get('redirectRoute');
      let searchParamsString = '';
      for (const key of searchParams.keys()) {
        if (key !== 'redirectRoute') {
          searchParamsString += `${key}=${searchParams.get(key)}&`;
        }
      }
      if (redirectRoute) {
        // Same as login: an unknown deep link reloads into the 404 page.
        skipLockOnNextLoad({ttlMs: 10000});
      }
      router.replace(
        redirectRoute
          ? `${redirectRoute}${
              searchParamsString ? '?' + searchParamsString : ''
            }`
          : `${walletRoutes.home(newWalletClientId)}${
              searchParamsString ? '?' + searchParamsString : ''
            }`,
      );
      dispatch(refreshCoins());
      setTimeout(() => {
        dispatch(setPhrase(null));
        dispatch(setPrivateKey(null));
        dispatch(setChainName(null));
      }, 500);
      toast.success('Wallet created successfully');
    } catch (error) {
      setIsSubmitting(false);
      toast.error('Something went wrong');
      console.error('error in create wallet', error);
    }
  };

  return {
    name,
    setName,
    onNameChange,
    clearName,
    inputRef,
    trimmed,
    isImport,
    isDuplicate,
    isSubmitting,
    canSubmit,
    suggestions,
    goBack,
    handleSubmit,
  };
};

export default useNameNewWallet;
