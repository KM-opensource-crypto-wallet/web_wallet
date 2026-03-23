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
import {isEVMChain} from 'dok-wallet-blockchain-networks/helper';
import {validateRpcUrl} from 'dok-wallet-blockchain-networks/service/rpcService';
import {showToast} from 'src/utils/toast';
import GoBackButton from 'components/GoBackButton';
import s from './AddCustomRpc.module.css';

import aptosLogo from 'assets/chain_logo/aptos.png';
import arbitrumLogo from 'assets/chain_logo/arbitrum.png';
import avalancheLogo from 'assets/chain_logo/avalanche.png';
import baseLogo from 'assets/chain_logo/base.png';
import binanceSmartChainLogo from 'assets/chain_logo/binance_smart_chain.png';
import cosmosLogo from 'assets/chain_logo/cosmos.png';
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
import rippleLogo from 'assets/chain_logo/ripple.png';
import solanaLogo from 'assets/chain_logo/solana.png';
import stellarLogo from 'assets/chain_logo/stellar.png';
import tezosLogo from 'assets/chain_logo/tezos.png';
import tonLogo from 'assets/chain_logo/ton.png';
import tronLogo from 'assets/chain_logo/tron.png';
import victionLogo from 'assets/chain_logo/viction.png';
import zksyncLogo from 'assets/chain_logo/zksync.png';
import seiLogo from 'assets/chain_logo/sei.png';

const CHAIN_LIST = [
  {chain_name: 'aptos', chain_display_name: 'Aptos', logo: aptosLogo},
  {chain_name: 'arbitrum', chain_display_name: 'Arbitrum', logo: arbitrumLogo},
  {
    chain_name: 'avalanche',
    chain_display_name: 'Avalanche',
    logo: avalancheLogo,
  },
  {chain_name: 'base', chain_display_name: 'Base', logo: baseLogo},
  {
    chain_name: 'binance_smart_chain',
    chain_display_name: 'BNB Smart Chain',
    logo: binanceSmartChainLogo,
  },
  {chain_name: 'cosmos', chain_display_name: 'Cosmos', logo: cosmosLogo},
  {chain_name: 'ethereum', chain_display_name: 'Ethereum', logo: ethereumLogo},
  {
    chain_name: 'ethereum_classic',
    chain_display_name: 'Ethereum Classic',
    logo: ethereumClassicLogo,
  },
  {
    chain_name: 'ethereum_pow',
    chain_display_name: 'Ethereum PoW',
    logo: ethereumPowLogo,
  },
  {chain_name: 'fantom', chain_display_name: 'Fantom', logo: fantomLogo},
  {chain_name: 'gnosis', chain_display_name: 'Gnosis', logo: gnosisLogo},
  {chain_name: 'ink', chain_display_name: 'Ink', logo: inkLogo},
  {chain_name: 'kava', chain_display_name: 'Kava', logo: kavaLogo},
  {chain_name: 'linea', chain_display_name: 'Linea', logo: lineaLogo},
  {chain_name: 'optimism', chain_display_name: 'Optimism', logo: optimismLogo},
  {
    chain_name: 'optimism_binance_smart_chain',
    chain_display_name: 'Optimism BSC',
    logo: optimismBinanceSmartChainLogo,
  },
  {chain_name: 'polygon', chain_display_name: 'Polygon', logo: polygonLogo},
  {chain_name: 'ripple', chain_display_name: 'Ripple', logo: rippleLogo},
  {chain_name: 'solana', chain_display_name: 'Solana', logo: solanaLogo},
  {chain_name: 'stellar', chain_display_name: 'Stellar', logo: stellarLogo},
  {chain_name: 'tezos', chain_display_name: 'Tezos', logo: tezosLogo},
  {chain_name: 'ton', chain_display_name: 'TON', logo: tonLogo},
  {chain_name: 'tron', chain_display_name: 'Tron', logo: tronLogo},
  {chain_name: 'viction', chain_display_name: 'Viction', logo: victionLogo},
  {chain_name: 'zksync', chain_display_name: 'zkSync', logo: zksyncLogo},
  {chain_name: 'sei', chain_display_name: 'Sei', logo: seiLogo},
];

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

    // if (isEVMChain(selectedChain)) {
    //   setValidating(true);
    //   let validationResult;
    //   try {
    //     validationResult = await validateRpcUrl(rpcUrl.trim(), selectedChain);
    //   } catch (err) {
    //     setValidating(false);
    //     showToast({
    //       type: 'errorToast',
    //       title: 'Validation Error',
    //       message: 'Failed to validate RPC URL. Please try again.',
    //     });
    //     return;
    //   }
    //   setValidating(false);
    //   if (!validationResult.isValid) {
    //     showToast({
    //       type: 'errorToast',
    //       title: 'Invalid RPC URL',
    //       message: validationResult.error,
    //     });
    //     return;
    //   }
    // }

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
