'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {
  getMasterClientId,
  selectAllWallets,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getNotificationAlerts} from 'dok-wallet-blockchain-networks/redux/notificationAlerts/notificationAlertsSelector';
import {
  deleteAlertThunk,
  fetchSubscriptionsThunk,
} from 'dok-wallet-blockchain-networks/redux/notificationAlerts/notificationAlertsSlice';
import {initOneSignal} from 'utils/onesignal';
import {FIFTEEN_MIN_MS, MAX_ALERTS} from 'utils/notificationAlertHelpers';
import {showToast} from 'utils/toast';
import GoBackButton from 'components/GoBackButton';
import NotificationAlertItem from 'components/NotificationAlertItem';
import NotificationWizard from 'components/NotificationWizard';
import ModalConfirm from 'components/ModalConfirm';
import s from './NotificationAlerts.module.css';

const NotificationAlerts = () => {
  const dispatch = useDispatch();
  const userId = useSelector(getMasterClientId);
  const alerts = useSelector(getNotificationAlerts, shallowEqual);
  const wallets = useSelector(selectAllWallets, shallowEqual);

  const [permission, setPermission] = useState('default');
  const [showWizard, setShowWizard] = useState(false);
  const [editAlert, setEditAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dismissedBannerId, setDismissedBannerId] = useState(null);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!userId || permission !== 'granted') return;
    setLoading(true);
    dispatch(fetchSubscriptionsThunk()).finally(() => setLoading(false));
  }, [dispatch, userId, permission]);

  // 15-min activation banner
  const latestAlert = useMemo(
    () =>
      alerts
        .filter(a => a.createdAt)
        .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null,
    [alerts],
  );
  const showBanner = !!latestAlert && latestAlert.id !== dismissedBannerId;

  useEffect(() => {
    if (!showBanner || !latestAlert?.createdAt) return;
    const remaining = latestAlert.createdAt + FIFTEEN_MIN_MS - Date.now();
    if (remaining <= 0) {
      setDismissedBannerId(latestAlert.id);
      return;
    }
    const timer = setTimeout(
      () => setDismissedBannerId(latestAlert.id),
      remaining,
    );
    return () => clearTimeout(timer);
  }, [latestAlert?.id, latestAlert?.createdAt, showBanner]);

  const filteredAlerts = useMemo(() => {
    if (!search.trim()) return alerts;
    const q = search.toLowerCase();
    return alerts.filter(
      a =>
        a.coinSymbol?.toLowerCase().includes(q) ||
        a.coinName?.toLowerCase().includes(q) ||
        a.walletName?.toLowerCase().includes(q) ||
        a.wallet?.toLowerCase().includes(q),
    );
  }, [alerts, search]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'denied') {
      alert(
        'Push notifications are blocked. Please enable them in your browser settings, then reload the page.',
      );
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        await initOneSignal();
        if (userId) {
          setLoading(true);
          dispatch(fetchSubscriptionsThunk()).finally(() => setLoading(false));
        }
      }
    } catch {}
  }, [dispatch, userId]);

  const handleAddPress = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setEditAlert(null);
      setShowWizard(true);
      return;
    }
    const perm = Notification.permission;
    if (perm === 'granted') {
      setEditAlert(null);
      setShowWizard(true);
      return;
    }
    if (perm === 'denied') {
      alert(
        'Notifications are blocked in your browser. Please enable them in browser settings first.',
      );
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        await initOneSignal();
        setEditAlert(null);
        setShowWizard(true);
      } else if (result === 'denied') {
        alert(
          'Notifications are blocked. Please enable them in your browser settings.',
        );
      }
    } catch {}
  }, []);

  const handleWizardClose = useCallback(
    success => {
      setShowWizard(false);
      setEditAlert(null);
      if (success && userId) {
        setLoading(true);
        dispatch(fetchSubscriptionsThunk()).finally(() => setLoading(false));
      }
    },
    [dispatch, userId],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    const item = deleteTarget;
    setDeleteTarget(null);
    dispatch(deleteAlertThunk({item}))
      .unwrap()
      .then(() => {
        showToast({
          type: 'successToast',
          title: 'Alert deleted',
          message: `${item.coinSymbol} alert has been removed.`,
        });
      })
      .catch(err => {
        showToast({
          type: 'errorToast',
          title: 'Failed to delete alert',
          message:
            err?.message || 'Please check your connection and try again.',
        });
      });
  }, [dispatch, deleteTarget]);

  return (
    <div className={s.container}>
      <GoBackButton />

      {permission !== 'granted' && (
        <div className={s.permissionContainer}>
          <div className={s.permissionCard}>
            <div className={s.permissionIconWrap}>
              <svg
                width='80'
                height='80'
                viewBox='0 0 24 24'
                fill='none'
                stroke='var(--background)'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'>
                <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' />
                <path d='M13.73 21a2 2 0 0 1-3.46 0' />
                <line x1='1' y1='1' x2='23' y2='23' />
              </svg>
            </div>
            <p className={s.permissionTitle}>Enable Notifications</p>
            <p className={s.permissionDesc}>
              Get real-time alerts when you receive or send crypto above your
              set threshold. Tap below to grant notification access.
            </p>
            <button className={s.settingsButton} onClick={requestPermission}>
              {permission === 'denied'
                ? 'Open Browser Settings'
                : 'Enable Notifications'}
            </button>
          </div>
        </div>
      )}

      {permission === 'granted' && (
        <>
          <div className={s.searchBarRow}>
            <input
              className={s.searchInput}
              type='text'
              placeholder='Search alerts'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className={s.listHeader}>
            <span className={s.counterText}>
              {alerts.length}/{MAX_ALERTS} alerts
            </span>
            <button
              className={s.addBtn}
              disabled={alerts.length >= MAX_ALERTS}
              onClick={handleAddPress}>
              + Add
            </button>
          </div>

          {showBanner && (
            <div className={s.banner}>
              <span className={s.bannerIcon}>🕐</span>
              <span className={s.bannerText}>
                Your new alert may take up to 15 minutes to activate.
              </span>
              <button
                className={s.bannerClose}
                onClick={() => setDismissedBannerId(latestAlert?.id)}>
                ×
              </button>
            </div>
          )}

          {loading && alerts.length === 0 && (
            <div className={s.loaderWrap}>
              <div className={s.spinner} />
            </div>
          )}

          {!loading && filteredAlerts.length === 0 && (
            <div className={s.emptyState}>
              <div className={s.emptyIcon}>🔔</div>
              <p className={s.emptyTitle}>No notification alerts configured</p>
              <button
                className={s.settingsButton}
                disabled={alerts.length >= MAX_ALERTS}
                onClick={handleAddPress}>
                Add Alert
              </button>
            </div>
          )}

          {filteredAlerts.map(item => (
            <NotificationAlertItem
              key={item.id}
              item={item}
              onEdit={item => {
                setEditAlert(item);
                setShowWizard(true);
              }}
              onDelete={setDeleteTarget}
            />
          ))}
        </>
      )}

      {showWizard && (
        <NotificationWizard
          wallets={wallets}
          onClose={handleWizardClose}
          alertsCount={alerts.length}
          editAlert={editAlert}
        />
      )}

      <ModalConfirm
        visible={!!deleteTarget}
        title={`Delete alert for ${deleteTarget?.coinSymbol}?`}
        description='This alert will be permanently removed.'
        onPressYes={handleDeleteConfirm}
        onPressNo={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default NotificationAlerts;
