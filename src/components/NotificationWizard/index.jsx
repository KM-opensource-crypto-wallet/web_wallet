'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';
import {v4 as uuidv4} from 'uuid';
import {
  createCustomAlert,
  updateAlertThunk,
} from 'dok-wallet-blockchain-networks/redux/notificationAlerts/notificationAlertsSlice';
import {initOneSignal} from 'utils/onesignal';
import {showToast} from 'utils/toast';
import {
  buildAddressOptions,
  coinKey,
  getDefaultMinAmount,
  isAmountBelowThreshold,
  isBitcoinChain,
} from 'utils/notificationAlertHelpers';
import NotificationWalletStep from 'components/NotificationWalletStep';
import NotificationCoinStep from 'components/NotificationCoinStep';
import NotificationAddressStep from 'components/NotificationAddressStep';
import NotificationConfigStep from 'components/NotificationConfigStep';
import NotificationAmountWarningModal from 'components/NotificationAmountWarningModal';
import s from './NotificationWizard.module.css';

const STEP_TITLES = [
  'Select Wallet',
  'Select Coins',
  'Select Addresses',
  'Configure Alert',
];

const StepDots = ({active}) => (
  <div className={s.stepIndicator}>
    {[1, 2, 3, 4].map(i => (
      <span
        key={i}
        className={`${s.stepDot} ${i <= active ? s.stepDotActive : s.stepDotInactive}`}
      />
    ))}
  </div>
);

const NotificationWizard = ({wallets, onClose, alertsCount, editAlert}) => {
  const dispatch = useDispatch();
  const isEditMode = !!editAlert?.id;

  const [step, setStep] = useState(isEditMode ? 4 : 1);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [selectedCoinKeys, setSelectedCoinKeys] = useState(new Set());
  const [addressMap, setAddressMap] = useState({});
  const [minAmountMap, setMinAmountMap] = useState({});
  const [configCoinKey, setConfigCoinKey] = useState(null);
  const [notifyOnReceive, setNotifyOnReceive] = useState(true);
  const [notifyOnSend, setNotifyOnSend] = useState(true);
  const [amountError, setAmountError] = useState('');
  const [toggleError, setToggleError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAmountWarning, setShowAmountWarning] = useState(false);
  const [showCoinPicker, setShowCoinPicker] = useState(false);

  // Populate fields from existing alert in edit mode
  useEffect(() => {
    if (!isEditMode || !editAlert) return;
    const wallet = wallets.find(w => w.clientId === editAlert.walletClientId);
    if (!wallet) return;
    const coin = wallet.coins?.find(c => c._id === editAlert.coinId);
    if (!coin) return;
    setSelectedWallet(wallet);
    const key = coinKey(wallet.clientId, coin._id);
    setSelectedCoinKeys(new Set([key]));
    setAddressMap({[key]: editAlert.wallet || ''});
    setMinAmountMap({
      [key]: String(editAlert.minAmount ?? getDefaultMinAmount(coin)),
    });
    setConfigCoinKey(key);
    setNotifyOnReceive(editAlert.notifyOnReceive ?? true);
    setNotifyOnSend(editAlert.notifyOnSend ?? true);
  }, [isEditMode, editAlert, wallets]);

  const selectedCoinEntries = useMemo(() => {
    if (!selectedWallet) return [];
    return (selectedWallet.coins || [])
      .filter(c =>
        selectedCoinKeys.has(coinKey(selectedWallet.clientId, c._id)),
      )
      .map(c => ({
        coin: c,
        walletClientId: selectedWallet.clientId,
        walletId: selectedWallet.clientId,
        walletName: selectedWallet.walletName,
      }));
  }, [selectedWallet, selectedCoinKeys]);

  const handleSelectWallet = useCallback(wallet => {
    setSelectedWallet(wallet);
    setSelectedCoinKeys(new Set());
    setStep(2);
  }, []);

  const handleCoinsNext = useCallback(() => {
    const newAddressMap = {};
    for (const entry of selectedCoinEntries) {
      const key = coinKey(entry.walletClientId, entry.coin._id);
      const opts = buildAddressOptions(entry.coin);
      newAddressMap[key] = opts[0]?.value ?? entry.coin.address ?? '';
    }
    setAddressMap(newAddressMap);
    setStep(3);
  }, [selectedCoinEntries]);

  const handleAddressesNext = useCallback(() => {
    const newMinAmountMap = {};
    for (const entry of selectedCoinEntries) {
      const key = coinKey(entry.walletClientId, entry.coin._id);
      newMinAmountMap[key] = getDefaultMinAmount(entry.coin);
    }
    setMinAmountMap(newMinAmountMap);
    const firstEntry = selectedCoinEntries[0];
    setConfigCoinKey(
      firstEntry
        ? coinKey(firstEntry.walletClientId, firstEntry.coin._id)
        : null,
    );
    setStep(4);
  }, [selectedCoinEntries]);

  const toggleCoin = useCallback(
    coin => {
      const key = coinKey(selectedWallet?.clientId, coin._id);
      setSelectedCoinKeys(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [selectedWallet],
  );

  const validate = useCallback(() => {
    if (!notifyOnReceive && !notifyOnSend) {
      setToggleError('At least one notification type must be enabled');
      return false;
    }
    setToggleError('');
    for (const entry of selectedCoinEntries) {
      const key = coinKey(entry.walletClientId, entry.coin._id);
      const amt = parseFloat(minAmountMap[key]);
      if (!amt || amt <= 0) {
        setAmountError('Amount must be greater than 0');
        setConfigCoinKey(key);
        return false;
      }
    }
    setAmountError('');
    return true;
  }, [notifyOnReceive, notifyOnSend, selectedCoinEntries, minAmountMap]);

  const hasBelowThreshold = useCallback(
    () =>
      selectedCoinEntries.some(entry => {
        const key = coinKey(entry.walletClientId, entry.coin._id);
        return isAmountBelowThreshold(minAmountMap[key], entry.coin);
      }),
    [selectedCoinEntries, minAmountMap],
  );

  const doSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const oneSignalPlayerId = await initOneSignal();
      if (isEditMode) {
        const entry = selectedCoinEntries[0];
        const key = coinKey(entry.walletClientId, entry.coin._id);
        const payload = {
          id: editAlert.id,
          backendId: editAlert.backendId ?? null,
          walletClientId: entry.walletClientId,
          walletId: entry.walletId,
          walletName: entry.walletName,
          coinId: entry.coin._id,
          coinSymbol: entry.coin.symbol,
          coinName: entry.coin.name,
          coinIcon: entry.coin.icon,
          chainName: entry.coin.chain_name,
          chainDisplayName: entry.coin.chain_display_name || '',
          coinType: entry.coin.type,
          coinDecimal: entry.coin.decimal ?? 18,
          contractAddress:
            entry.coin.type === 'token' ? entry.coin.contractAddress : null,
          wallet: addressMap[key] || editAlert.wallet,
          minAmount: minAmountMap[key],
          notifyOnReceive,
          notifyOnSend,
        };
        await dispatch(updateAlertThunk({payload, oneSignalPlayerId})).unwrap();
        showToast({
          type: 'successToast',
          title: 'Alert updated',
          message: `${payload.coinSymbol} alert has been updated.`,
        });
      } else {
        const promises = selectedCoinEntries.map(entry => {
          const key = coinKey(entry.walletClientId, entry.coin._id);
          const base = {
            id: uuidv4(),
            backendId: null,
            createdAt: Date.now(),
            walletClientId: entry.walletClientId,
            walletId: entry.walletId,
            walletName: entry.walletName,
            coinId: entry.coin._id,
            coinSymbol: entry.coin.symbol,
            coinName: entry.coin.name,
            coinIcon: entry.coin.icon,
            chainDisplayName: entry.coin.chain_display_name || '',
            coinType: entry.coin.type,
            coinDecimal: entry.coin.decimal ?? 18,
            contractAddress:
              entry.coin.type === 'token' ? entry.coin.contractAddress : null,
            minAmount: minAmountMap[key],
            notifyOnReceive,
            notifyOnSend,
          };

          if (isBitcoinChain(entry.coin.chain_name)) {
            const allAddresses = (entry.coin.deriveAddresses || [])
              .map(d => d?.address)
              .filter(Boolean);
            const primaryAddress = allAddresses[0] || entry.coin.address || '';
            const payload = {
              ...base,
              chainName: 'bitcoin',
              wallet: primaryAddress,
              wallets: allAddresses,
            };
            return dispatch(
              createCustomAlert({payload, oneSignalPlayerId}),
            ).unwrap();
          }

          const payload = {
            ...base,
            chainName: entry.coin.chain_name,
            wallet: addressMap[key] || entry.coin.address || '',
          };
          return dispatch(
            createCustomAlert({payload, oneSignalPlayerId}),
          ).unwrap();
        });

        const results = await Promise.allSettled(promises);
        const failed = results.filter(r => r.status === 'rejected');
        const successCount = results.length - failed.length;

        if (successCount === 0) {
          const reason =
            failed[0]?.reason?.message ||
            String(failed[0]?.reason) ||
            'Please check your connection and try again.';
          showToast({
            type: 'errorToast',
            title: 'Failed to create alert',
            message: reason,
          });
          return;
        }

        if (failed.length > 0) {
          showToast({
            type: 'warningToast',
            title: `${failed.length} alert${failed.length > 1 ? 's' : ''} failed`,
            message: `${successCount} created, ${failed.length} could not be saved.`,
          });
        } else {
          showToast({
            type: 'successToast',
            title: `${successCount} alert${successCount > 1 ? 's' : ''} created`,
            message: 'You will receive notifications for the selected coins.',
          });
        }
      }
      onClose(true);
    } catch (err) {
      showToast({
        type: 'errorToast',
        title: isEditMode ? 'Failed to update alert' : 'Failed to create alert',
        message: err?.message || 'Please check your connection and try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    isEditMode,
    selectedCoinEntries,
    addressMap,
    minAmountMap,
    notifyOnReceive,
    notifyOnSend,
    editAlert,
    dispatch,
    onClose,
  ]);

  const onSubmit = useCallback(() => {
    if (!validate()) return;
    if (hasBelowThreshold()) {
      setShowAmountWarning(true);
      return;
    }
    doSave();
  }, [validate, hasBelowThreshold, doSave]);

  const handleBack = useCallback(() => {
    if (isEditMode || step <= 1) {
      onClose(false);
      return;
    }
    setStep(s => s - 1);
  }, [isEditMode, step, onClose]);

  return (
    <div className={s.overlay}>
      <div className={s.card}>
        <div className={s.header}>
          <button className={s.backBtn} onClick={handleBack}>
            {step > 1 && !isEditMode ? '←' : '×'}
          </button>
          <span className={s.title}>
            {isEditMode ? 'Edit Alert' : STEP_TITLES[step - 1]}
          </span>
          {step > 1 && !isEditMode ? (
            <button className={s.closeBtn} onClick={() => onClose(false)}>
              ×
            </button>
          ) : (
            <span style={{width: 36}} />
          )}
        </div>

        {!isEditMode && <StepDots active={step} />}

        {step === 1 && (
          <NotificationWalletStep
            wallets={wallets}
            onSelectWallet={handleSelectWallet}
          />
        )}
        {step === 2 && selectedWallet && (
          <NotificationCoinStep
            wallet={selectedWallet}
            selectedKeys={selectedCoinKeys}
            onToggle={toggleCoin}
            onNext={handleCoinsNext}
          />
        )}
        {step === 3 && selectedWallet && (
          <NotificationAddressStep
            wallet={selectedWallet}
            selectedCoinEntries={selectedCoinEntries}
            addressMap={addressMap}
            onAddressChange={(key, val) =>
              setAddressMap(prev => ({...prev, [key]: val}))
            }
            onNext={handleAddressesNext}
          />
        )}
        {step === 4 && (
          <NotificationConfigStep
            wallet={selectedWallet}
            selectedCoinEntries={selectedCoinEntries}
            configCoinKey={configCoinKey}
            setConfigCoinKey={setConfigCoinKey}
            addressMap={addressMap}
            minAmountMap={minAmountMap}
            onMinAmountChange={val => {
              setMinAmountMap(prev => ({...prev, [configCoinKey]: val}));
              setAmountError('');
            }}
            notifyOnReceive={notifyOnReceive}
            setNotifyOnReceive={v => {
              setNotifyOnReceive(v);
              setToggleError('');
            }}
            notifyOnSend={notifyOnSend}
            setNotifyOnSend={v => {
              setNotifyOnSend(v);
              setToggleError('');
            }}
            amountError={amountError}
            toggleError={toggleError}
            isSaving={isSaving}
            onSubmit={onSubmit}
            isEditMode={isEditMode}
            alertsCount={alertsCount}
            showCoinPicker={showCoinPicker}
            setShowCoinPicker={setShowCoinPicker}
          />
        )}
      </div>

      <NotificationAmountWarningModal
        visible={showAmountWarning}
        onConfirm={() => {
          setShowAmountWarning(false);
          doSave();
        }}
        onDismiss={() => setShowAmountWarning(false)}
      />
    </div>
  );
};

export default NotificationWizard;
