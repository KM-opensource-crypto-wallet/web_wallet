'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {
  getNotificationHistory,
  getHistoryLoading,
  getHistoryHasMore,
} from 'dok-wallet-blockchain-networks/redux/notificationAlerts/notificationAlertsSelector';
import {fetchNotificationHistoryThunk} from 'dok-wallet-blockchain-networks/redux/notificationAlerts/notificationAlertsSlice';
import GoBackButton from 'components/GoBackButton';
import s from './Notifications.module.css';

// ─── helpers ─────────────────────────────────────────────────────────────────

const truncate = (str, start = 10, end = 8) => {
  if (!str || str.length <= start + end + 3) return str || '—';
  return `${str.slice(0, start)}...${str.slice(-end)}`;
};

const formatTime = iso =>
  new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

const formatDate = iso => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = iso =>
  new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// ─── Detail modal ─────────────────────────────────────────────────────────────

const CopyRow = ({label, value}) => {
  const copy = () => navigator.clipboard?.writeText(value);
  return (
    <div className={s.detailRow}>
      <span className={s.detailLabel}>{label}</span>
      <div className={s.detailValueRow}>
        <span className={s.detailValue}>{truncate(value, 12, 8)}</span>
        {value && (
          <button className={s.copyBtn} onClick={copy} title='Copy'>
            ⎘
          </button>
        )}
      </div>
    </div>
  );
};

const DetailModal = ({item, onClose}) => {
  const isReceive = item.direction === 'receive';
  return (
    <div className={s.modal} onClick={onClose}>
      <div className={s.modalCard} onClick={e => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span
            className={`${s.badge} ${isReceive ? s.receiveBadge : s.sendBadge}`}>
            {isReceive ? 'Received' : 'Sent'}
          </span>
          <button className={s.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <p className={s.detailAmount}>
          {isReceive ? '+' : '-'}
          {item.amount} {item.coin || ''}
        </p>
        <div className={s.detailRow}>
          <span className={s.detailLabel}>Chain</span>
          <span className={s.detailValue}>{item.chainName}</span>
        </div>
        <div className={s.detailRow}>
          <span className={s.detailLabel}>Date</span>
          <span className={s.detailValue}>
            {formatDateTime(item.notifiedAt)}
          </span>
        </div>
        <CopyRow label='From' value={item.from} />
        <CopyRow label='To' value={item.to} />
        <CopyRow label='TX Hash' value={item.txHash} />
        {item.blockNumber && (
          <div className={s.detailRow}>
            <span className={s.detailLabel}>Block</span>
            <span className={s.detailValue}>{item.blockNumber}</span>
          </div>
        )}
        {item.contractAddress && (
          <CopyRow label='Contract' value={item.contractAddress} />
        )}
      </div>
    </div>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const Notifications = () => {
  const dispatch = useDispatch();
  const items = useSelector(getNotificationHistory, shallowEqual);
  const loading = useSelector(getHistoryLoading);
  const hasMore = useSelector(getHistoryHasMore);
  const [selectedItem, setSelectedItem] = useState(null);

  // Initial load — reset pagination
  useEffect(() => {
    dispatch(fetchNotificationHistoryThunk({reset: true}));
  }, [dispatch]);

  const loadMore = useCallback(() => {
    dispatch(fetchNotificationHistoryThunk());
  }, [dispatch]);

  // Group items by date with separator rows
  const grouped = useMemo(() => {
    const result = [];
    let lastDate = null;
    for (const item of items) {
      const label = formatDate(item.notifiedAt);
      if (label !== lastDate) {
        result.push({type: 'separator', label, key: `sep_${label}`});
        lastDate = label;
      }
      result.push({type: 'item', ...item, key: item._id || item.txHash});
    }
    return result;
  }, [items]);

  return (
    <div className={s.container}>
      <GoBackButton />

      {loading && items.length === 0 ? (
        <p className={s.loader}>Loading...</p>
      ) : grouped.length === 0 ? (
        <p className={s.emptyText}>No notification history yet</p>
      ) : (
        <>
          {grouped.map(row =>
            row.type === 'separator' ? (
              <p key={row.key} className={s.dateSeparator}>
                {row.label}
              </p>
            ) : (
              <div
                key={row.key}
                className={s.item}
                onClick={() => setSelectedItem(row)}>
                <div
                  className={`${s.directionIcon} ${row.direction === 'receive' ? s.receiveIcon : s.sendIcon}`}>
                  {row.direction === 'receive' ? '↓' : '↑'}
                </div>
                <div className={s.itemInfo}>
                  <div className={s.itemTop}>
                    <span className={s.coinSymbol}>{row.coin || 'Token'}</span>
                    <span
                      className={`${s.amount} ${row.direction === 'receive' ? s.receiveAmount : s.sendAmount}`}>
                      {row.direction === 'receive' ? '+' : '-'}
                      {row.amount}
                    </span>
                  </div>
                  <div className={s.itemBottom}>
                    <span className={s.chainText}>{row.chainName}</span>
                    <span className={s.timeText}>
                      {formatTime(row.notifiedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ),
          )}
          {hasMore && !loading && (
            <button className={s.loadMoreBtn} onClick={loadMore}>
              Load more
            </button>
          )}
          {loading && items.length > 0 && (
            <p className={s.loader}>Loading...</p>
          )}
        </>
      )}

      {selectedItem && (
        <DetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

export default Notifications;
