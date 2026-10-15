import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';
import {useRouter, useSearchParams} from 'next/navigation';
import {
  addCustomRpc,
  updateCustomRpc,
} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSlice';
import {isEVMChain, CustomRPCList} from 'dok-wallet-blockchain-networks/helper';
import {getRPCUrl} from 'dok-wallet-blockchain-networks/rpcUrls/rpcUrls';
import {validateRpcUrl} from 'dok-wallet-blockchain-networks/service/rpcService';
import {showToast} from 'src/utils/toast';
import useWallet from 'src/hooks/wallet/useWallet';

// Logic for the Add / Edit Custom RPC screen (app/settings/add-custom-rpc).
// `?chain_name=` switches it to edit mode; `?customRpcUrl=` and `?wallets=`
// prefill the form.
export const useCustomRpcSettings = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const {visibleWallets: allWallets} = useWallet();

  const editChainName = searchParams.get('chain_name');
  const isEdit = Boolean(editChainName);

  // The existing association may include hidden (locked) wallets. The picker
  // only lists visible wallets, so remember the original set to carry those
  // unpickable ids forward on save (otherwise updateCustomRpc drops them).
  const previousWallets = useMemo(() => {
    const walletsParam = searchParams.get('wallets');
    return walletsParam ? walletsParam.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const [selectedChain, setSelectedChain] = useState(editChainName || '');
  const [rpcUrl, setRpcUrl] = useState(searchParams.get('customRpcUrl') || '');
  const [selectedWallets, setSelectedWallets] = useState([]);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [chainPickerOpen, setChainPickerOpen] = useState(false);
  const [chainQuery, setChainQuery] = useState('');

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      const walletsParam = searchParams.get('wallets');
      if (walletsParam) {
        setSelectedWallets(walletsParam.split(',').filter(Boolean));
      } else if (allWallets?.length) {
        setSelectedWallets(allWallets.map(w => w.clientId));
      }
    })();
  }, [searchParams, allWallets]);

  const defaultRpcUrl = useMemo(() => {
    return selectedChain ? getRPCUrl(selectedChain) : '';
  }, [selectedChain]);

  const allSelected = useMemo(
    () =>
      allWallets?.length > 0 &&
      allWallets.every(w => selectedWallets.includes(w.clientId)),
    [allWallets, selectedWallets],
  );

  const toggleWallet = useCallback(clientId => {
    setSelectedWallets(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId],
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedWallets([]);
    } else {
      setSelectedWallets(allWallets.map(w => w.clientId));
    }
  }, [allSelected, allWallets]);

  const onSave = useCallback(async () => {
    if (!selectedChain) {
      setError('Please select a chain.');
      return;
    }
    if (!rpcUrl.trim()) {
      setError('Please enter an RPC URL.');
      return;
    }
    if (selectedWallets.length === 0) {
      setError('Please select at least one wallet.');
      return;
    }
    setError('');

    if (isEVMChain(selectedChain)) {
      setValidating(true);
      let validationResult;
      try {
        validationResult = await validateRpcUrl(rpcUrl.trim(), selectedChain);
      } catch (err) {
        setValidating(false);
        showToast({
          type: 'errorToast',
          title: 'Validation Error',
          message: 'Failed to validate RPC URL. Please try again.',
        });
        return;
      }
      setValidating(false);
      if (!validationResult.isValid) {
        showToast({
          type: 'errorToast',
          title: 'Invalid RPC URL',
          message: validationResult.error,
        });
        return;
      }
    }

    const chainEntry = CustomRPCList.find(c => c.value === selectedChain);
    // Carry forward any hidden wallets' ids that aren't in the (visible-only)
    // picker so their association isn't silently dropped on update.
    const pickerClientIds = new Set(allWallets.map(w => w.clientId));
    const preservedClientIds = previousWallets.filter(
      id => !pickerClientIds.has(id),
    );
    const payload = {
      chain_name: selectedChain,
      chain_display_name: chainEntry?.label || selectedChain,
      customRpcUrl: rpcUrl.trim(),
      wallets: Array.from(
        new Set([
          ...selectedWallets.filter(id => pickerClientIds.has(id)),
          ...preservedClientIds,
        ]),
      ),
    };

    if (isEdit) {
      dispatch(updateCustomRpc(payload));
    } else {
      dispatch(addCustomRpc(payload));
    }

    router.back();
  }, [
    selectedChain,
    rpcUrl,
    selectedWallets,
    isEdit,
    dispatch,
    router,
    allWallets,
    previousWallets,
  ]);

  const selectedChainEntry = CustomRPCList.find(c => c.value === selectedChain);
  const chainResults = useMemo(() => {
    const q = chainQuery.trim().toLowerCase();
    return q
      ? CustomRPCList.filter(
          c =>
            c.label?.toLowerCase().includes(q) ||
            c.value?.toLowerCase().includes(q),
        )
      : CustomRPCList;
  }, [chainQuery]);

  const closeChainPicker = () => {
    setChainQuery('');
    setChainPickerOpen(false);
  };

  return {
    goBack: () => router.back(),
    isEdit,

    // Chain and RPC URL
    selectedChain,
    selectedChainEntry,
    isEvmChain: isEVMChain(selectedChain),
    defaultRpcUrl,
    rpcUrl,
    onRpcUrlChange: e => setRpcUrl(e.target.value),

    // Wallets
    allWallets,
    selectedWallets,
    allSelected,
    toggleWallet,
    toggleSelectAll,

    // Save
    error,
    validating,
    onSave,

    // Chain picker sheet
    chainPickerOpen,
    openChainPicker: () => setChainPickerOpen(true),
    closeChainPicker,
    chainQuery,
    onChainQueryChange: e => setChainQuery(e.target.value),
    chainResults,
    pickChain: value => {
      setSelectedChain(value);
      closeChainPicker();
    },
  };
};

export default useCustomRpcSettings;
