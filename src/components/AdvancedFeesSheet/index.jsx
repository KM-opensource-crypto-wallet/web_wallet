'use client';

import React from 'react';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import {isEVMChain, weiToGwei} from 'dok-wallet-blockchain-networks/helper';
import icons from 'assets/images/icons';
import s from './AdvancedFeesSheet.module.css';

const inputSx = {
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--sidebarIcon)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--borderActiveColor)',
  },
  '&:hover fieldset': {
    borderColor: 'var(--sidebarIcon) !important',
  },
  // The hover rule above uses !important, so the error border needs the same
  // weight or it flips back to gray while hovered.
  '&.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--error)',
  },
  '&.Mui-error:hover fieldset': {
    borderColor: 'var(--error) !important',
  },
};

const FeeInput = ({
  id,
  name,
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  error = false,
  autoFocus = false,
}) => (
  <div className={s.inputFieldContainer}>
    <div className={s.inputLabelWithIcon}>
      <span className={s.inputIcon}>{icon}</span>
      <label htmlFor={id} className={s.inputLabelText}>
        {label}
      </label>
    </div>
    <FormControl variant='outlined' fullWidth>
      <OutlinedInput
        fullWidth
        id={id}
        name={name}
        type='text'
        inputMode='decimal'
        autoFocus={autoFocus}
        error={error}
        value={value}
        placeholder={placeholder}
        onChange={e => onChangeText(e.target.value)}
        sx={inputSx}
      />
    </FormControl>
  </div>
);

// Body of the "Advanced Options" panel (fee presets, custom fee inputs, nonce).
// Rendered inline under CommonTransfer's collapsible header; state and
// handlers come from useAdvancedFees via `sheetProps`.
const AdvancedFeesSheet = ({
  feesOptions,
  selectedFeesType,
  customFees,
  customNonce,
  gasCurrency,
  onSelectFeesType,
  onChangeCustomFees,
  onChangeCustomNonce,
  chainName,
  // EIP-1559 extras. All optional: legacy chains omit them and get the single
  // "Gas Price" input as before.
  isEip1559 = false,
  customPriorityFee,
  onChangeCustomPriorityFee,
  baseFeePerGas,
  customFeesError = null,
}) => {
  const isEVM = isEVMChain(chainName);
  const showPriorityFee = isEip1559 && !!onChangeCustomPriorityFee;
  const baseFeeGwei = isEip1559 ? weiToGwei(baseFeePerGas) : null;
  const gasLabel = isEip1559 ? 'Max Fee' : 'Gas Price';
  const isSelected = type =>
    selectedFeesType?.toLowerCase() === type.toLowerCase();

  return (
    <>
      {/* Gas Price / Max Fee Section */}
      {!!feesOptions?.length && (
        <div className={s.feesMainContainer}>
          <div className={s.feesOptionContainer}>
            {feesOptions.map(option => {
              // The lowercased title is the feesType key the polling
              // estimate is re-run with ('recommended' / 'normal').
              const type = option?.title?.toLowerCase();
              if (!type) {
                return null;
              }
              return (
                <button
                  key={type}
                  type='button'
                  className={`${s.feesOptionsItem} ${
                    isSelected(option.title) ? s.feesOptionsItemSelected : ''
                  }`}
                  onClick={() => onSelectFeesType(type, option.gasPrice)}>
                  <p className={s.feesOptionTitle}>{option.title}</p>
                  <p className={s.feesOptionDescription}>
                    {`${option.gasPrice} ${gasCurrency}`}
                  </p>
                </button>
              );
            })}
            <button
              type='button'
              className={`${s.feesOptionsItem} ${
                isSelected('custom') ? s.feesOptionsItemSelected : ''
              }`}
              onClick={() => onSelectFeesType('custom')}>
              <p className={s.feesOptionTitle}>Custom</p>
            </button>
          </div>
          {baseFeeGwei != null && (
            <p className={s.hint}>
              {`Current base fee: ${baseFeeGwei} ${gasCurrency}. You pay base fee + priority fee, capped at the max fee.`}
            </p>
          )}
          {selectedFeesType === 'custom' && (
            <>
              <FeeInput
                id='customText'
                name='Gas Price'
                autoFocus
                icon={icons.gasPump}
                label={`Custom ${gasLabel} (${gasCurrency})`}
                placeholder={`Enter ${gasLabel.toLowerCase()}`}
                value={customFees}
                onChangeText={onChangeCustomFees}
              />
              {showPriorityFee && (
                <>
                  <FeeInput
                    id='priorityFeeInput'
                    name='Priority Fee'
                    icon={icons.gasPump}
                    label={`Priority Fee (${gasCurrency})`}
                    placeholder='Enter priority fee'
                    value={customPriorityFee}
                    onChangeText={onChangeCustomPriorityFee}
                    error={!!customFeesError}
                  />
                  {customFeesError ? (
                    <p className={s.errorText}>{customFeesError}</p>
                  ) : (
                    <p className={s.hint}>
                      Tip paid to validators. Must not exceed the max fee.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
      {/* Nonce Section */}
      {isEVM && (
        <>
          <FeeInput
            id='nonceInput'
            name='Nonce'
            icon={icons.hashNumber}
            label='Nonce'
            placeholder='Enter custom nonce'
            value={customNonce}
            onChangeText={onChangeCustomNonce}
          />
          <p className={s.hint}>
            Used for transaction ordering. Only modify if you know what
            you&apos;re doing.
          </p>
        </>
      )}
    </>
  );
};

export default AdvancedFeesSheet;
