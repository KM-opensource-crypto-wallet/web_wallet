'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useRouter, useSearchParams} from 'next/navigation';
import {Checkbox, FormControlLabel, TextField} from '@mui/material';
import SelectInput from 'components/SelectInput';
import {
  addCustomRpc,
  updateCustomRpc,
} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSlice';
import {selectAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {isEVMChain, CustomRPCList} from 'dok-wallet-blockchain-networks/helper';
import {getRPCUrl} from 'dok-wallet-blockchain-networks/rpcUrls/rpcUrls';
import {validateRpcUrl} from 'dok-wallet-blockchain-networks/service/rpcService';
import {showToast} from 'src/utils/toast';
import GoBackButton from 'components/GoBackButton';
import s from './AddCustomRpc.module.css';

const AddCustomRpc = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const allWallets = useSelector(selectAllWallets);

  const editChainName = searchParams.get('chain_name');
  const isEdit = Boolean(editChainName);

  const [selectedChain, setSelectedChain] = useState(editChainName || '');
  const [rpcUrl, setRpcUrl] = useState(searchParams.get('customRpcUrl') || '');
  const [selectedWallets, setSelectedWallets] = useState([]);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    const walletsParam = searchParams.get('wallets');
    if (walletsParam) {
      setSelectedWallets(walletsParam.split(',').filter(Boolean));
    } else if (allWallets?.length) {
      setSelectedWallets(allWallets.map(w => w.clientId));
    }
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
    const payload = {
      chain_name: selectedChain,
      chain_display_name: chainEntry?.label || selectedChain,
      customRpcUrl: rpcUrl.trim(),
      wallets: selectedWallets,
    };

    if (isEdit) {
      dispatch(updateCustomRpc(payload));
    } else {
      dispatch(addCustomRpc(payload));
    }

    router.back();
  }, [selectedChain, rpcUrl, selectedWallets, isEdit, dispatch, router]);

  return (
    <div className={s.container}>
      <GoBackButton />
      <p className={s.title}>{isEdit ? 'Edit Custom RPC' : 'Add Custom RPC'}</p>

      <p className={s.description}>
        Select a wallet and network, then enter a custom RPC URL to override the
        default endpoint for that chain.
      </p>

      {/* Chain selector */}
      <div className={s.field}>
        <label className={s.label}>Select Chain</label>
        <SelectInput
          listData={CustomRPCList}
          onValueChange={val => setSelectedChain(val)}
          value={selectedChain}
          placeholder='Select a chain'
        />
      </div>

      {/* Default RPC URL (read-only, shown after chain selected) */}
      {!!defaultRpcUrl && (
        <div className={s.field}>
          <label className={s.label}>Default RPC URL</label>
          <TextField
            value={defaultRpcUrl}
            fullWidth
            variant='outlined'
            size='small'
            disabled
            className={s.textField}
            slotProps={{input: {style: {color: 'var(--gray)'}}}}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {borderColor: 'var(--whiteOutline)'},
                backgroundColor: 'var(--secondaryBackgroundColor)',
                borderRadius: '8px',
              },
            }}
          />
        </div>
      )}

      {/* Custom RPC URL input */}
      <div className={s.field}>
        <label className={s.label} htmlFor='rpc-url'>
          Custom RPC URL
        </label>
        <TextField
          id='rpc-url'
          value={rpcUrl}
          onChange={e => setRpcUrl(e.target.value)}
          placeholder='Enter Custom RPC URL'
          fullWidth
          variant='outlined'
          size='small'
          className={s.textField}
          slotProps={{input: {style: {color: 'var(--font)'}}}}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {borderColor: 'var(--whiteOutline)'},
              '&:hover fieldset': {borderColor: '#f44d03'},
              '&.Mui-focused fieldset': {borderColor: '#f44d03'},
              backgroundColor: 'var(--secondaryBackgroundColor)',
              borderRadius: '8px',
            },
          }}
        />
      </div>

      {/* Wallet selection */}
      <div className={s.field}>
        <fieldset className={s.walletFieldset}>
          <legend className={s.label}>Apply to Wallets</legend>
          <div className={s.walletList}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  color='warning'
                />
              }
              label={<span className={s.walletName}>Select All</span>}
              className={s.walletItem}
            />
            {allWallets?.map(wallet => (
              <FormControlLabel
                key={wallet.clientId}
                control={
                  <Checkbox
                    id={`wallet-${wallet.clientId}`}
                    checked={selectedWallets.includes(wallet.clientId)}
                    onChange={() => toggleWallet(wallet.clientId)}
                    color='warning'
                  />
                }
                label={
                  <span className={s.walletName}>{wallet.walletName}</span>
                }
                className={s.walletItem}
              />
            ))}
          </div>
        </fieldset>
      </div>

      {error ? <p className={s.error}>{error}</p> : null}

      <button className={s.saveBtn} onClick={onSave} disabled={validating}>
        {validating ? 'Validating...' : isEdit ? 'Update' : 'Save'}
      </button>
    </div>
  );
};

export default AddCustomRpc;
