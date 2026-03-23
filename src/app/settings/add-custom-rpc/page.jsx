'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useRouter, useSearchParams} from 'next/navigation';
import Image from 'next/image';
import {
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import {
  addCustomRpc,
  updateCustomRpc,
} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSlice';
import {selectAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {isEVMChain, CustomRPCList} from 'dok-wallet-blockchain-networks/helper';
import {validateRpcUrl} from 'dok-wallet-blockchain-networks/service/rpcService';
import {showToast} from 'src/utils/toast';
import GoBackButton from 'components/GoBackButton';
import s from './AddCustomRpc.module.css';

import arbitrumLogo from 'assets/chain_logo/arbitrum.png';
import avalancheLogo from 'assets/chain_logo/avalanche.png';
import baseLogo from 'assets/chain_logo/base.png';
import binanceSmartChainLogo from 'assets/chain_logo/binance_smart_chain.png';
import ethereumLogo from 'assets/chain_logo/ethereum.png';
import ethereumClassicLogo from 'assets/chain_logo/ethereum_classic.png';
import ethereumPowLogo from 'assets/chain_logo/ethereum_pow.png';
import fantomLogo from 'assets/chain_logo/fantom.png';
import gnosisLogo from 'assets/chain_logo/gnosis.png';
import inkLogo from 'assets/chain_logo/ink.png';
import kavaLogo from 'assets/chain_logo/kava.png';
import lineaLogo from 'assets/chain_logo/linea.png';
import optimismLogo from 'assets/chain_logo/optimism.png';
import optimismBinanceSmartChainLogo from 'assets/chain_logo/optimism_binance_smart_chain.png';
import polygonLogo from 'assets/chain_logo/polygon.png';
import victionLogo from 'assets/chain_logo/viction.png';
import zksyncLogo from 'assets/chain_logo/zksync.png';
import seiLogo from 'assets/chain_logo/sei.png';

const CHAIN_LOGO_MAP = {
  arbitrum: arbitrumLogo,
  avalanche: avalancheLogo,
  base: baseLogo,
  binance_smart_chain: binanceSmartChainLogo,
  ethereum: ethereumLogo,
  ethereum_classic: ethereumClassicLogo,
  ethereum_pow: ethereumPowLogo,
  fantom: fantomLogo,
  gnosis: gnosisLogo,
  ink: inkLogo,
  kava: kavaLogo,
  linea: lineaLogo,
  optimism: optimismLogo,
  optimism_binance_smart_chain: optimismBinanceSmartChainLogo,
  polygon: polygonLogo,
  viction: victionLogo,
  zksync: zksyncLogo,
  sei: seiLogo,
};

const CHAIN_LIST = CustomRPCList.map(({value, label}) => ({
  chain_name: value,
  chain_display_name: label,
  logo: CHAIN_LOGO_MAP[value],
}));

const AddCustomRpc = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const allWallets = useSelector(selectAllWallets);

  // Determine if we're in edit mode
  const editChainName = searchParams.get('chain_name');
  const isEdit = Boolean(editChainName);

  const [selectedChain, setSelectedChain] = useState(editChainName || '');
  const [rpcUrl, setRpcUrl] = useState(searchParams.get('customRpcUrl') || '');
  const [selectedWallets, setSelectedWallets] = useState([]);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  // Pre-select wallets: all wallets by default, or the saved list when editing
  useEffect(() => {
    const walletsParam = searchParams.get('wallets');
    if (walletsParam) {
      setSelectedWallets(walletsParam.split(',').filter(Boolean));
    } else if (allWallets?.length) {
      setSelectedWallets(allWallets.map(w => w.clientId));
    }
  }, [searchParams, allWallets]);

  const chainData = useMemo(
    () => CHAIN_LIST.find(c => c.chain_name === selectedChain),
    [selectedChain],
  );

  const toggleWallet = useCallback(clientId => {
    setSelectedWallets(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId],
    );
  }, []);

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

    if (!chainData) {
      setError('Invalid chain selected.');
      return;
    }

    const payload = {
      chain_name: chainData.chain_name,
      chain_display_name: chainData.chain_display_name,
      customRpcUrl: rpcUrl.trim(),
      wallets: selectedWallets,
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
    chainData,
    isEdit,
    dispatch,
    router,
  ]);

  return (
    <div className={s.container}>
      <GoBackButton />
      <p className={s.title}>{isEdit ? 'Edit Custom RPC' : 'Add Custom RPC'}</p>

      {/* Chain selector */}
      <div className={s.field}>
        <label className={s.label}>Select Chain</label>
        <Select
          value={selectedChain}
          onChange={e => setSelectedChain(e.target.value)}
          displayEmpty
          className={s.select}
          renderValue={val => {
            const chain = CHAIN_LIST.find(c => c.chain_name === val);
            if (!chain)
              return <span className={s.placeholder}>Select a chain</span>;
            return (
              <div className={s.chainOption}>
                <Image
                  src={chain.logo}
                  alt={chain.chain_name}
                  width={20}
                  height={20}
                  className={s.chainOptionIcon}
                />
                <span>{chain.chain_display_name}</span>
              </div>
            );
          }}>
          {CHAIN_LIST.map(chain => (
            <MenuItem key={chain.chain_name} value={chain.chain_name}>
              <div className={s.chainOption}>
                <Image
                  src={chain.logo}
                  alt={chain.chain_name}
                  width={20}
                  height={20}
                  className={s.chainOptionIcon}
                />
                <span>{chain.chain_display_name}</span>
              </div>
            </MenuItem>
          ))}
        </Select>
      </div>

      {/* RPC URL input */}
      <div className={s.field}>
        <label className={s.label}>RPC URL</label>
        <TextField
          value={rpcUrl}
          onChange={e => setRpcUrl(e.target.value)}
          placeholder='https://your-rpc-url.com'
          fullWidth
          variant='outlined'
          size='small'
          className={s.textField}
          inputProps={{style: {color: 'var(--font)'}}}
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
        <label className={s.label}>Apply to Wallets</label>
        <div className={s.walletList}>
          {allWallets?.map(wallet => (
            <FormControlLabel
              key={wallet.clientId}
              control={
                <Checkbox
                  checked={selectedWallets.includes(wallet.clientId)}
                  onChange={() => toggleWallet(wallet.clientId)}
                  color='warning'
                />
              }
              label={<span className={s.walletName}>{wallet.walletName}</span>}
              className={s.walletItem}
            />
          ))}
        </div>
      </div>

      {error ? <p className={s.error}>{error}</p> : null}

      <button className={s.saveBtn} onClick={onSave} disabled={validating}>
        {validating ? 'Validating...' : isEdit ? 'Update' : 'Save'}
      </button>
    </div>
  );
};

export default AddCustomRpc;
