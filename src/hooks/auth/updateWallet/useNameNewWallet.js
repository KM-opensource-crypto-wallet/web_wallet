import {useEffect, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useDispatch} from 'react-redux';
import {toast} from 'react-toastify';
import {walletRoutes} from 'utils/routes';
import {skipLockOnNextLoad} from 'utils/lockScreen';
import {
  createWallet,
  refreshCoins,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  setChainName,
  setPhrase,
  setPrivateKey,
} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {resetPaymentUrl} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import useWallet from 'src/hooks/wallet/useWallet';
import {
  REPLAY_SKIP_LOCK_TTL_MS,
  WALLET_NAME_SUGGESTIONS,
} from 'src/data/constants';

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
  const {
    phrase,
    privateKey,
    chainName: chain_name,
    currentWalletClientId,
    allWalletName,
  } = useWallet();
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
  const suggestions = WALLET_NAME_SUGGESTIONS.filter(
    item =>
      !sameName(item, trimmed) &&
      !allWalletName.some(existing => sameName(existing, item)),
  );

  const onNameChange = e => setName(e.target.value);

  const clearName = () => {
    setName('');
    inputRef.current?.focus();
  };

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
        skipLockOnNextLoad({ttlMs: REPLAY_SKIP_LOCK_TTL_MS});
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
    handleSubmit,
  };
};

export default useNameNewWallet;
