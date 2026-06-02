'use client';

import {useMemo} from 'react';
import {
  coinKey,
  isAmountBelowThreshold,
  MAX_ALERTS,
  MIN_USD_AMOUNT,
  truncateAddress,
} from 'utils/notificationAlertHelpers';
import CoinAvatar from 'components/CoinAvatar';
import ChainBadge from 'components/ChainBadge';
import NotificationStepLayout from 'components/NotificationStepLayout';
import NotificationCoinPickerModal from 'components/NotificationCoinPickerModal';
import s from './NotificationConfigStep.module.css';

const NotificationConfigStep = ({
  wallet,
  selectedCoinEntries,
  configCoinKey,
  setConfigCoinKey,
  addressMap,
  minAmountMap,
  onMinAmountChange,
  notifyOnReceive,
  setNotifyOnReceive,
  notifyOnSend,
  setNotifyOnSend,
  amountError,
  toggleError,
  isSaving,
  onSubmit,
  isEditMode,
  alertsCount,
  showCoinPicker,
  setShowCoinPicker,
}) => {
  const configEntry = useMemo(
    () =>
      selectedCoinEntries.find(e => {
        const wid = wallet?.clientId || e.walletClientId;
        return coinKey(wid, e.coin._id) === configCoinKey;
      }),
    [selectedCoinEntries, configCoinKey, wallet],
  );

  const minAmount = minAmountMap[configCoinKey] ?? '';
  const hasMultipleCoins = selectedCoinEntries.length > 1;
  const atLimit = alertsCount >= MAX_ALERTS;
  const belowThreshold =
    configEntry && isAmountBelowThreshold(minAmount, configEntry.coin);

  const saveLabel = isSaving
    ? 'Saving...'
    : isEditMode
      ? 'Update Alert'
      : 'Save Alert';

  return (
    <NotificationStepLayout
      footerLabel={saveLabel}
      onFooterPress={onSubmit}
      footerDisabled={isSaving || (atLimit && !isEditMode)}>
      {hasMultipleCoins && (
        <button
          className={s.coinPickerBtn}
          onClick={() => setShowCoinPicker(true)}>
          <CoinAvatar
            icon={configEntry?.coin.icon}
            symbol={configEntry?.coin.symbol}
            size='sm'
          />
          <span className={s.coinPickerSymbol}>{configEntry?.coin.symbol}</span>
          <span className={s.coinPickerMore}>
            +{selectedCoinEntries.length - 1} more ▾
          </span>
        </button>
      )}

      {configEntry && (
        <div className={s.summaryCard}>
          <CoinAvatar
            icon={configEntry.coin.icon}
            symbol={configEntry.coin.symbol}
            size='lg'
          />
          <div className={s.summaryInfo}>
            <div className={s.summaryTop}>
              <span className={s.summarySymbol}>{configEntry.coin.symbol}</span>
              <ChainBadge
                chain={
                  configEntry.coin.chain_display_name ||
                  configEntry.coin.chain_name
                }
              />
            </div>
            <span className={s.summaryWallet}>
              {wallet?.walletName || configEntry.walletName}
            </span>
            <span className={s.summaryAddress}>
              {truncateAddress(addressMap[configCoinKey] || '')}
            </span>
          </div>
        </div>
      )}

      <div className={s.fieldGroup}>
        <label className={s.fieldLabel}>
          Minimum Amount ({configEntry?.coin.symbol || 'tokens'})
        </label>
        <input
          className={`${s.amountInput} ${amountError ? s.inputError : ''}`}
          type='number'
          min='0'
          step='any'
          value={minAmount}
          onChange={e => onMinAmountChange(e.target.value)}
          placeholder='0.00'
        />
        {belowThreshold && !amountError && (
          <span className={s.belowThresholdText}>
            Amount is below ${MIN_USD_AMOUNT} USD equivalent
          </span>
        )}
        {amountError && <span className={s.errorText}>{amountError}</span>}
      </div>

      <div className={s.toggleRow}>
        <span className={s.toggleLabel}>Notify on Receive</span>
        <label className={s.switchLabel}>
          <input
            type='checkbox'
            checked={notifyOnReceive}
            onChange={e => setNotifyOnReceive(e.target.checked)}
          />
          <span className={s.slider} />
        </label>
      </div>
      <div className={s.toggleRow}>
        <span className={s.toggleLabel}>Notify on Send</span>
        <label className={s.switchLabel}>
          <input
            type='checkbox'
            checked={notifyOnSend}
            onChange={e => setNotifyOnSend(e.target.checked)}
          />
          <span className={s.slider} />
        </label>
      </div>

      {toggleError && <p className={s.errorText}>{toggleError}</p>}
      {atLimit && !isEditMode && (
        <p className={s.errorText}>Maximum of {MAX_ALERTS} alerts reached.</p>
      )}

      <NotificationCoinPickerModal
        visible={showCoinPicker}
        wallet={wallet}
        selectedCoinEntries={selectedCoinEntries}
        configCoinKey={configCoinKey}
        onSelect={key => {
          setConfigCoinKey(key);
          setShowCoinPicker(false);
        }}
        onDismiss={() => setShowCoinPicker(false)}
      />
    </NotificationStepLayout>
  );
};

export default NotificationConfigStep;
