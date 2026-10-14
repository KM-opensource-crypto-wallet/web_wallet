'use client';
import Image from 'next/image';
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
import useCustomRpcSettings from 'src/hooks/settings/customRPC/useCustomRpcSettings';
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
  const {
    goBack,
    isEdit,
    selectedChain,
    selectedChainEntry,
    isEvmChain,
    defaultRpcUrl,
    rpcUrl,
    onRpcUrlChange,
    allWallets,
    selectedWallets,
    allSelected,
    toggleWallet,
    toggleSelectAll,
    error,
    validating,
    onSave,
    chainPickerOpen,
    openChainPicker,
    closeChainPicker,
    chainQuery,
    onChainQueryChange,
    chainResults,
    pickChain,
  } = useCustomRpcSettings();

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={goBack}>
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
              onClick={openChainPicker}>
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
                onChange={onRpcUrlChange}
                placeholder='https://'
                type='url'
                inputMode='url'
                autoComplete='off'
                autoCapitalize='off'
                spellCheck={false}
              />
            </div>
            {isEvmChain ? (
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
            onChange={onChainQueryChange}
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
                onClick={() => pickChain(chain.value)}>
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
