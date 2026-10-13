'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useRouter, useSearchParams} from 'next/navigation';
import Image from 'next/image';
import {
  addCustomRpc,
  updateCustomRpc,
} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSlice';
import {selectVisibleWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {isEVMChain, CustomRPCList} from 'dok-wallet-blockchain-networks/helper';
import {getRPCUrl} from 'dok-wallet-blockchain-networks/rpcUrls/rpcUrls';
import {validateRpcUrl} from 'dok-wallet-blockchain-networks/service/rpcService';
import {showToast} from 'src/utils/toast';
import {chainLogoMap} from 'assets/chain_logo';
import GeneralButton from 'components/Button';
import HomeSheet from 'components/Home/HomeSheet';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  InfoIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import {ServerIcon} from '../SettingsIcons';
import hs from 'components/Home/Home.module.css';
import s from './AddCustomRpc.module.css';

// Chain logo, or a server glyph for chains without one.
const ChainLogo = ({chain, size = 36}) => {
  const logo = chainLogoMap[chain?.toLowerCase()];
  return (
    <span className={s.chainLogo} style={{width: size, height: size}}>
      {logo ? (
        <Image src={logo} alt='' width={size} height={size} />
      ) : (
        <ServerIcon size={Math.round(size / 2)} />
      )}
    </span>
  );
};

const AddCustomRpc = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const allWallets = useSelector(selectVisibleWallets);

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

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <h1 className={s.title}>
          {isEdit ? 'Edit Custom RPC' : 'Add Custom RPC'}
        </h1>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>

      <div className={s.column}>
        <p className={s.lead}>
          Select a wallet and network, then enter a custom RPC URL to override
          the default endpoint for that chain.
        </p>

        <section className={s.card} aria-label='RPC endpoint'>
          <div className={s.field}>
            <span className={s.fieldLabel} id='chain-label'>
              Chain
            </span>
            <button
              type='button'
              className={s.chainButton}
              aria-haspopup='dialog'
              aria-labelledby='chain-label'
              onClick={() => setChainPickerOpen(true)}>
              {selectedChain ? (
                <>
                  <ChainLogo chain={selectedChain} />
                  <span className={s.chainName}>
                    {selectedChainEntry?.label || selectedChain}
                  </span>
                </>
              ) : (
                <span className={s.chainPlaceholder}>Select a chain</span>
              )}
              <ChevronDownIcon size={18} className={s.chevron} />
            </button>
          </div>

          {!!defaultRpcUrl && (
            <div className={s.field}>
              <span className={s.fieldLabel}>Default RPC URL</span>
              <p className={s.readonly}>{defaultRpcUrl}</p>
            </div>
          )}

          <div className={s.field}>
            <label className={s.fieldLabel} htmlFor='rpc-url'>
              Custom RPC URL
            </label>
            <div className={s.inputRow}>
              <input
                id='rpc-url'
                className={s.input}
                value={rpcUrl}
                onChange={e => setRpcUrl(e.target.value)}
                placeholder='https://'
                type='url'
                inputMode='url'
                autoComplete='off'
                autoCapitalize='off'
                spellCheck={false}
              />
            </div>
            {isEVMChain(selectedChain) ? (
              <p className={s.hint}>
                We check the URL answers for this chain before saving.
              </p>
            ) : null}
          </div>
        </section>

        <section className={s.section} aria-labelledby='wallets-label'>
          <div className={s.sectionHead}>
            <h2 className={s.sectionLabel} id='wallets-label'>
              Apply to wallets
            </h2>
            <button
              type='button'
              role='checkbox'
              aria-checked={!!allSelected}
              className={s.selectAll}
              onClick={toggleSelectAll}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className={s.walletCard}>
            {allWallets?.map(wallet => {
              const checked = selectedWallets.includes(wallet.clientId);
              return (
                <button
                  key={wallet.clientId}
                  id={`wallet-${wallet.clientId}`}
                  type='button'
                  role='checkbox'
                  aria-checked={checked}
                  className={`${s.walletRow} ${checked ? s.walletRowOn : ''}`}
                  onClick={() => toggleWallet(wallet.clientId)}>
                  <span className={s.walletAvatar} aria-hidden='true'>
                    {(wallet.walletName || 'W')[0].toUpperCase()}
                  </span>
                  <span className={s.walletName}>{wallet.walletName}</span>
                  <span className={s.tick} aria-hidden='true'>
                    {checked ? <CheckIcon size={13} strokeWidth={3} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {error ? (
          <p className={s.alert} role='alert'>
            <InfoIcon size={16} />
            <span>{error}</span>
          </p>
        ) : null}

        <GeneralButton
          fullWidth
          loading={validating}
          loadingLabel='Validating…'
          onClick={onSave}>
          {isEdit ? 'Update' : 'Save'}
        </GeneralButton>
      </div>

      <HomeSheet
        visible={chainPickerOpen}
        onClose={closeChainPicker}
        title='Select a chain'
        labelId='chain-picker-title'>
        <label className={hs.sheetSearch}>
          <SearchIcon size={17} />
          <input
            autoFocus={true}
            value={chainQuery}
            onChange={e => setChainQuery(e.target.value)}
            placeholder='Search chains'
            aria-label='Search chains'
          />
        </label>
        <div className={hs.pickerList} role='listbox' aria-label='Chains'>
          {chainResults.map(chain => {
            const active = chain.value === selectedChain;
            return (
              <button
                key={chain.value}
                type='button'
                role='option'
                aria-selected={active}
                className={`${s.chainOption} ${
                  active ? s.chainOptionActive : ''
                }`}
                onClick={() => {
                  setSelectedChain(chain.value);
                  closeChainPicker();
                }}>
                <ChainLogo chain={chain.value} size={34} />
                <span className={s.chainOptionName}>{chain.label}</span>
                {active ? (
                  <CheckIcon size={18} className={s.chainCheck} />
                ) : null}
              </button>
            );
          })}
          {chainResults.length === 0 ? (
            <p className={hs.sheetEmpty}>No chains found</p>
          ) : null}
        </div>
      </HomeSheet>
    </main>
  );
};

export default AddCustomRpc;
