import {useAppRoutes} from 'src/hooks/useAppRoutes';
import React, {useState, useRef, useCallback, useMemo} from 'react';
import {currencySymbol} from 'src/data/lists/currency';
import s from './Transactions.module.css';
import dayjs from 'dayjs';
import {useRouter} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {getPendingTransferData} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSelector';
import Spinner from 'components/Spinner';
import ModalCancelPendingTransaction from 'components/ModalCancelPendingTransaction';
import {sendPendingTransactions} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {calculateEstimateFeeForPendingTransaction} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {
  isPendingTransactionSupportedChain,
  isTransactionListNotSupported,
} from 'dok-wallet-blockchain-networks/helper';
import {ChevronRightIcon, CloseIcon} from 'components/Home/HomeIcons';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoltIcon,
  CheckCircleIcon,
  ContractIcon,
  EmptyIcon,
  ImageIcon,
  LayersIcon,
  ShieldIcon,
  TrendDownIcon,
  TrendUpIcon,
} from './TxIcons';

// kind -> icon and tone class; `dir` is set for plain sends / receives only,
// which are the ones that count towards the net figures.
const KINDS = {
  received: {Icon: ArrowDownIcon, tone: 'toneIn'},
  sent: {Icon: ArrowUpIcon, tone: 'toneOut'},
  stake: {Icon: TrendUpIcon, tone: 'toneIn'},
  unstake: {Icon: TrendDownIcon, tone: 'toneIn'},
  withdraw: {Icon: ArrowDownIcon, tone: 'toneIn'},
  rewards: {Icon: TrendUpIcon, tone: 'toneIn'},
  vote: {Icon: CheckCircleIcon, tone: 'toneBlue'},
  contract: {Icon: ContractIcon, tone: 'tonePurple'},
  delegation: {Icon: ShieldIcon, tone: 'toneBlue'},
  batch: {Icon: LayersIcon, tone: 'toneBlue'},
  nft: {Icon: ImageIcon, tone: 'tonePurple'},
};

export const isReceivedTx = (item, walletAddress) =>
  item?.paymentType != null
    ? item.paymentType === 1
    : item?.to?.toUpperCase() === walletAddress?.toUpperCase();

export const describeTransaction = (item, walletAddress) => {
  if (item?.isNFT) return {kind: 'nft', label: 'NFT'};
  if (item?.isBatchTransaction || item?.transactionType === 'batch') {
    return {kind: 'batch', label: 'Batch'};
  }
  if (item?.isCreateStaking || item?.transactionType === 'stake') {
    return {kind: 'stake', label: 'Stake'};
  }
  if (item?.isWithdrawStaking || item?.transactionType === 'withdraw') {
    return {kind: 'withdraw', label: 'Withdraw'};
  }
  if (item?.isDeactivateStaking || item?.transactionType === 'unstake') {
    return {kind: 'unstake', label: 'Unstake'};
  }
  if (item?.isStakingRewards) return {kind: 'rewards', label: 'Rewards'};
  if (item?.isCreateVote) return {kind: 'vote', label: 'Vote'};
  if (item?.transactionType === 'smartContract') {
    return {kind: 'contract', label: 'Contract call'};
  }
  if (item?.transactionType === 'delegationChange') {
    return {kind: 'delegation', label: 'Delegation'};
  }
  return isReceivedTx(item, walletAddress)
    ? {kind: 'received', label: 'Received', dir: 'in'}
    : {kind: 'sent', label: 'Sent', dir: 'out'};
};

export const txStatus = item => {
  const status = String(item?.status || '').toUpperCase();
  if (status === 'PENDING') return 'pending';
  if (/^(FAIL|ERROR|REJECT|REVERT|CANCEL)/.test(status)) return 'failed';
  return 'success';
};

export const fiatValue = item => parseFloat(item?.totalCourse) || 0;

const shortAddress = address =>
  address && address.length > 14
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address || '';

const dayLabel = date => {
  const day = dayjs(date);
  if (day.isSame(dayjs(), 'day')) return 'Today';
  if (day.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return day.format('D MMM YYYY');
};

export const formatSignedFiat = (value, symbol) =>
  `${value < 0 ? '−' : '+'}${symbol || ''}${Math.abs(value).toLocaleString(
    'en-US',
    {minimumFractionDigits: 2, maximumFractionDigits: 2},
  )}`;

const STATUS_LABEL = {pending: 'Pending', failed: 'Failed'};

const SkeletonList = () => (
  <div className={s.skeletons} aria-busy='true' aria-label='Loading'>
    {[
      ['58%', '40%'],
      ['44%', '52%'],
      ['62%', '36%'],
      ['50%', '46%'],
      ['40%', '58%'],
    ].map(([w1, w2], index) => (
      <div key={index} className={s.skeleton}>
        <span className={s.skeletonIcon} />
        <span className={s.skeletonText}>
          <span className={s.skeletonLine} style={{width: w1}} />
          <span className={s.skeletonLineSub} style={{width: w2}} />
        </span>
        <span className={s.skeletonAmount} />
      </div>
    ))}
  </div>
);

const Transactions = ({
  renderList,
  currentCoin,
  localCurrency,
  isLoading,
  grouped = true,
  hasFilters,
  onResetFilters,
  onPressViewAll,
}) => {
  const dispatch = useDispatch();
  const pendingTransferData = useSelector(getPendingTransferData);
  const selectedTransactionRef = useRef(null);
  const router = useRouter();
  const routes = useAppRoutes();
  const [showCancelModal, setShowCancelModal] = useState(false);
  // Rendered (passed to the modal), so it is state rather than a ref.
  const [isCancelTransaction, setIsCancelTransaction] = useState(null);

  const fiatSymbol = currencySymbol[localCurrency] || '';
  const symbol = currentCoin?.symbol?.toUpperCase() ?? '';
  const canUpdatePending = isPendingTransactionSupportedChain(
    currentCoin?.chain_name,
  );

  const isTransactionNotSupported = useMemo(
    () =>
      isTransactionListNotSupported(currentCoin?.chain_name, currentCoin?.type),
    [currentCoin?.chain_name, currentCoin?.type],
  );

  // Date sorts are grouped by day (in list order, so ascending works too);
  // amount sorts stay one flat list.
  const groups = useMemo(() => {
    const list = renderList || [];
    if (!grouped) {
      return list.length ? [{label: 'All transactions', items: list}] : [];
    }
    const byDay = new Map();
    list.forEach(item => {
      const label = dayLabel(item?.date);
      if (!byDay.has(label)) byDay.set(label, []);
      byDay.get(label).push(item);
    });
    return [...byDay.entries()].map(([label, items]) => ({label, items}));
  }, [renderList, grouped]);

  const calculatePendingTransaction = useCallback(
    tx => {
      setShowCancelModal(true);
      dispatch(
        calculateEstimateFeeForPendingTransaction({
          fromAddress: tx?.extraPendingTransactionData?.from,
          toAddress: tx?.extraPendingTransactionData?.to,
          value: tx?.extraPendingTransactionData?.value,
          data: tx?.extraPendingTransactionData?.data,
          nonce: tx?.extraPendingTransactionData?.nonce,
          isCancelTransaction: true,
        }),
      );
      selectedTransactionRef.current = tx;
    },
    [dispatch],
  );

  const onPressSpeedUp = useCallback(
    tx => {
      calculatePendingTransaction(tx);
      setIsCancelTransaction(false);
    },
    [calculatePendingTransaction],
  );
  const onPressCancel = useCallback(
    tx => {
      calculatePendingTransaction(tx);
      setIsCancelTransaction(true);
    },
    [calculatePendingTransaction],
  );

  const onPressYes = useCallback(() => {
    setShowCancelModal(false);
    const tx = selectedTransactionRef.current;
    dispatch(
      sendPendingTransactions({
        from: tx?.extraPendingTransactionData?.from,
        to: tx?.extraPendingTransactionData?.to,
        value: tx?.extraPendingTransactionData?.value,
        data: tx?.extraPendingTransactionData?.data,
        pendingTxHash: tx?.extraPendingTransactionData?.txHash,
        nonce: tx?.extraPendingTransactionData?.nonce,
        isCancelTransaction,
        router,
      }),
    );
  }, [dispatch, router, isCancelTransaction]);

  const renderItem = (item, index, items) => {
    const {kind, label, dir} = describeTransaction(item, currentCoin?.address);
    const {Icon, tone} = KINDS[kind] || KINDS.sent;
    const status = txStatus(item);
    const time = item?.date ? dayjs(item.date).format('HH:mm') : '';
    const counterparty =
      dir === 'in'
        ? `From ${shortAddress(item?.from)}`
        : dir === 'out'
          ? `To ${shortAddress(item?.to)}`
          : '';
    const sub = [
      counterparty,
      grouped ? time : dayjs(item?.date).format('D MMM YYYY · HH:mm'),
    ]
      .filter(Boolean)
      .join(' · ');
    const amountText = `${dir === 'in' ? '+' : dir === 'out' ? '−' : ''}${
      item?.amount ?? ''
    } ${symbol}`;
    const amountClass =
      status === 'failed'
        ? s.amountFailed
        : dir === 'in'
          ? s.amountIn
          : s.amountOut;
    const showPendingActions = status === 'pending' && canUpdatePending;
    const isLast = index === items.length - 1;

    return (
      <div
        key={item?.link || `${item?.date}-${index}`}
        className={`${s.item} ${isLast ? '' : s.itemDivider}`}>
        <button
          type='button'
          className={s.row}
          disabled={!item?.link}
          onClick={() => {
            if (item?.link) {
              router.push(routes.coin.transactionDetails(item.link));
            }
          }}>
          <span className={s.iconWrap}>
            <span className={`${s.icon} ${s[tone]}`}>
              <Icon size={19} />
            </span>
            {status !== 'success' ? (
              <span
                className={`${s.statusDot} ${
                  status === 'pending' ? s.dotPending : s.dotFailed
                }`}
                title={STATUS_LABEL[status]}
              />
            ) : null}
          </span>
          <span className={s.text}>
            <span className={s.title}>{label}</span>
            {sub ? <span className={s.sub}>{sub}</span> : null}
          </span>
          <span className={s.amounts}>
            <span className={`${s.amount} ${amountClass}`} title={amountText}>
              {amountText}
            </span>
            <span
              className={`${s.fiat} ${
                status === 'pending'
                  ? s.fiatPending
                  : status === 'failed'
                    ? s.fiatFailed
                    : ''
              }`}>
              {status === 'success'
                ? `${fiatSymbol}${item?.totalCourse ?? '0'}`
                : STATUS_LABEL[status]}
            </span>
          </span>
          <ChevronRightIcon size={17} className={s.chevron} />
        </button>
        {showPendingActions ? (
          <div className={s.pendingActions}>
            <button
              type='button'
              className={s.pendingButton}
              onClick={() => onPressSpeedUp(item)}>
              <BoltIcon size={14} />
              Speed up
            </button>
            <button
              type='button'
              className={`${s.pendingButton} ${s.pendingCancel}`}
              onClick={() => onPressCancel(item)}>
              <CloseIcon size={13} />
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {isLoading ? (
        <SkeletonList />
      ) : groups.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}>
            <EmptyIcon size={26} />
          </span>
          <p className={s.emptyTitle}>Nothing here yet</p>
          <p className={s.emptyText}>
            {hasFilters
              ? 'No transactions match this filter. Try a different type or reset the filters.'
              : isTransactionNotSupported
                ? 'To see the latest transactions, open them on the explorer with “View all”.'
                : 'Your transactions will show up here. Share your address or QR code to receive a payment.'}
          </p>
          {hasFilters ? (
            <button
              type='button'
              className={s.emptyAction}
              onClick={onResetFilters}>
              Reset filters
            </button>
          ) : isTransactionNotSupported && onPressViewAll ? (
            <button
              type='button'
              className={s.emptyAction}
              onClick={onPressViewAll}>
              View all
            </button>
          ) : null}
        </div>
      ) : (
        groups.map(group => {
          const net = group.items.reduce((sum, item) => {
            if (txStatus(item) !== 'success') return sum;
            const {dir} = describeTransaction(item, currentCoin?.address);
            if (dir === 'in') return sum + fiatValue(item);
            if (dir === 'out') return sum - fiatValue(item);
            return sum;
          }, 0);
          return (
            <section
              key={group.label}
              className={s.group}
              aria-label={group.label}>
              <div className={s.groupHead}>
                <span className={s.groupLabel}>{group.label}</span>
                {net !== 0 ? (
                  <span
                    className={`${s.groupNet} ${net > 0 ? s.groupNetIn : ''}`}>
                    {formatSignedFiat(net, fiatSymbol)}
                  </span>
                ) : null}
              </div>
              <div className={s.card}>
                {group.items.map((item, index) =>
                  renderItem(item, index, group.items),
                )}
              </div>
            </section>
          );
        })
      )}
      {pendingTransferData.isSubmitting && <Spinner />}
      <ModalCancelPendingTransaction
        visible={showCancelModal}
        onPressYes={onPressYes}
        onPressNo={() => {
          setShowCancelModal(false);
        }}
        pendingTransferData={pendingTransferData}
        currentCoin={currentCoin}
        localCurrency={localCurrency}
        isCancelTransaction={isCancelTransaction}
      />
    </>
  );
};

export default Transactions;
