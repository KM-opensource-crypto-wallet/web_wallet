'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useParams} from 'next/navigation';
import {
  selectCurrentCoin,
  selectCurrentCoinRecentTransaction,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {fetchTransactionByHash} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {currencySymbol} from 'data/currency';
import dayjs from 'dayjs';
import PageTitle from 'components/PageTitle';
import {showToast} from 'utils/toast';
import s from './TransactionDetails.module.css';
import {
  ContractCall,
  CopyIcon,
  ExternalLinkIcon,
  LayersIcon,
  PowerIcon,
  ReceiveIcon,
  SendIcon,
  StarIcon,
  TrendDownIcon,
  TrendUpIcon,
  VoteIcon,
} from 'assets/images/icons';

const STATUS_CONFIG = {
  SUCCESS: {label: 'Success', color: '#71C441'},
  PENDING: {label: 'Pending', color: '#ffcc00'},
  FAILED: {label: 'Failed', color: '#FF4444'},
};

const truncateAddress = address => {
  if (!address || typeof address !== 'string' || address.length <= 16) {
    return typeof address === 'string' ? address : undefined;
  }
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
};

const CopyRow = ({value}) => {
  const stringValue = typeof value === 'string' ? value : undefined;
  const handleCopy = () => {
    if (stringValue) {
      navigator.clipboard?.writeText(stringValue).then(() => {
        showToast({type: 'success', title: 'Copied to clipboard'});
      });
    }
  };
  return (
    <button className={s.rowValueRow} onClick={handleCopy}>
      <span className={s.rowValue}>{truncateAddress(stringValue)}</span>
      <CopyIcon />
    </button>
  );
};

const TransactionDetails = () => {
  const params = useParams();
  const txHash = decodeURIComponent(params.txHash);
  const dispatch = useDispatch();
  const currentCoin = useSelector(selectCurrentCoin);
  const localCurrency = useSelector(getLocalCurrency);
  const reduxRecentTransaction = useSelector(
    selectCurrentCoinRecentTransaction,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [nftImageError, setNftImageError] = useState(false);
  const statusRef = useRef(null);

  const initialTransaction = currentCoin?.transactions?.find(
    t => t.link === txHash,
  );

  const recentTx =
    reduxRecentTransaction?.data?.link === txHash
      ? reduxRecentTransaction?.data
      : null;

  const transaction = recentTx
    ? {
        ...initialTransaction,
        from: recentTx.from,
        to: recentTx.to,
        amount: recentTx.amount,
        date: recentTx.blockTimestamp
          ? new Date(parseInt(recentTx.blockTimestamp, 16) * 1000).toISOString()
          : initialTransaction?.date,
        status: recentTx.status,
        link: recentTx.link,
        totalCourse: recentTx.totalCourse,
        blockNumber: recentTx.blockNumber,
        confirmations: recentTx.confirmations,
        ...(recentTx.paymentType != null && {
          paymentType: recentTx.paymentType,
        }),
      }
    : initialTransaction;

  useEffect(() => {
    if (recentTx?.status) {
      statusRef.current = recentTx.status;
    }
  }, [recentTx?.status]);

  const currentCoinRef = useRef(currentCoin);

  const fetchTransaction = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(
        fetchTransactionByHash({txHash, currentCoin: currentCoinRef.current}),
      ).unwrap();
    } catch (e) {
      console.error('Error refreshing transaction', e);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, txHash]);

  useEffect(() => {
    fetchTransaction();
    const interval = setInterval(() => {
      const upperStatus = statusRef.current?.toUpperCase();
      if (upperStatus === 'SUCCESS' || upperStatus === 'FAILED') {
        clearInterval(interval);
        return;
      }
      fetchTransaction();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!transaction) {
    return (
      <>
        <PageTitle title='Transaction Details' />
        <div className={s.emptyContainer}>
          <p className={s.emptyText}>No transaction data found.</p>
        </div>
      </>
    );
  }

  // ── Transaction type detection ──────────────────────────────────────────────

  const isNFT = !!transaction?.isNFT;
  const isBatchTx = !!(
    transaction?.isBatchTransaction || transaction?.transactionType === 'batch'
  );
  const isStakingTx = !!(
    transaction?.isCreateStaking ||
    transaction?.isWithdrawStaking ||
    transaction?.isDeactivateStaking ||
    transaction?.isStakingRewards ||
    transaction?.transactionType === 'stake' ||
    transaction?.transactionType === 'unstake' ||
    transaction?.transactionType === 'withdraw'
  );
  const isVoteTx = !!transaction?.isCreateVote;
  const isRegularTx = !isNFT && !isBatchTx && !isStakingTx && !isVoteTx;

  const stakingLabel =
    transaction?.isCreateStaking || transaction?.transactionType === 'stake'
      ? 'Staking'
      : transaction?.isWithdrawStaking ||
          transaction?.transactionType === 'withdraw'
        ? 'Withdraw'
        : transaction?.isDeactivateStaking ||
            transaction?.transactionType === 'unstake'
          ? 'Unstaking'
          : 'Claimed Rewards';

  const isReceived = isRegularTx
    ? transaction?.paymentType != null
      ? transaction.paymentType === 1
      : transaction?.to?.toUpperCase() === currentCoin?.address?.toUpperCase()
    : false;

  const statusKey = transaction?.status?.toUpperCase();
  const statusConfig = STATUS_CONFIG[statusKey] || {
    label: transaction?.status || '—',
    color: '#888',
  };
  const badgeBgColor = statusConfig.color + '22';

  const pageTitle = isNFT
    ? 'NFT Transfer'
    : `${currentCoin?.name || ''} Transaction`;

  const onViewExplorer = () => {
    if (transaction?.url) {
      window.open(transaction.url, '_blank', 'noopener,noreferrer');
    }
  };

  // ── Shared sub-components ───────────────────────────────────────────────────

  const StatusBadge = () => (
    <div className={s.statusBadge} style={{backgroundColor: badgeBgColor}}>
      <div
        className={s.statusDot}
        style={{backgroundColor: statusConfig.color}}
      />
      <span className={s.statusText} style={{color: statusConfig.color}}>
        {statusConfig.label}
      </span>
    </div>
  );

  const renderCommonRows = () => (
    <>
      {!!transaction.date && (
        <>
          <div className={s.divider} />
          <div className={s.row}>
            <span className={s.rowLabel}>Date</span>
            <span className={s.rowValue}>
              {dayjs(transaction.date).format('DD MMM YYYY, HH:mm')}
            </span>
          </div>
        </>
      )}
      {transaction.blockNumber != null && (
        <>
          <div className={s.divider} />
          <div className={s.row}>
            <span className={s.rowLabel}>Block no.</span>
            <span className={s.rowValue}>{transaction.blockNumber}</span>
          </div>
        </>
      )}
      {transaction.confirmations != null && (
        <>
          <div className={s.divider} />
          <div className={s.row}>
            <span className={s.rowLabel}>No. of Confirmation</span>
            <span className={s.rowValue}>{transaction.confirmations}</span>
          </div>
        </>
      )}
      {!!transaction.link && (
        <>
          <div className={s.divider} />
          <div className={s.row}>
            <span className={s.rowLabel}>Tx Hash</span>
            <CopyRow value={transaction.link} />
          </div>
        </>
      )}
    </>
  );

  const ExplorerButton = () =>
    !!transaction.url ? (
      <button className={s.explorerBtn} onClick={onViewExplorer}>
        <ExternalLinkIcon />
        View on Explorer
      </button>
    ) : null;

  // ── NFT ─────────────────────────────────────────────────────────────────────

  if (isNFT) {
    const nftLabel = transaction.nftTokenId
      ? `${transaction.nftName || '—'} (#${transaction.nftTokenId})`
      : transaction.nftName || '—';

    return (
      <>
        <PageTitle title={pageTitle} />
        {refreshing && <div className={s.refreshingBar} />}
        <div className={s.container}>
          <div className={s.hero}>
            {transaction.nftImage && !nftImageError ? (
              <img
                src={transaction.nftImage}
                className={s.nftHeroImage}
                alt='NFT'
                onError={() => setNftImageError(true)}
              />
            ) : (
              <div className={s.nftHeroImage}>
                <div className={s.nftPlaceholder}>
                  <span className={s.nftPlaceholderText}>NFT</span>
                </div>
              </div>
            )}
            <span className={s.txType}>NFT Transfer</span>
            <span className={s.amount}>{nftLabel}</span>
            <StatusBadge />
          </div>

          <div className={s.card}>
            <p className={s.cardTitle}>Transaction Details</p>
            {!!currentCoin?.chain_display_name && (
              <>
                <div className={s.divider} />
                <div className={s.row}>
                  <span className={s.rowLabel}>Chain</span>
                  <span className={s.rowValue}>
                    {currentCoin.chain_display_name}
                  </span>
                </div>
              </>
            )}
            {!!transaction.from && (
              <>
                <div className={s.divider} />
                <div className={s.row}>
                  <span className={s.rowLabel}>From</span>
                  <CopyRow value={transaction.from} />
                </div>
              </>
            )}
            {!!transaction.to && (
              <>
                <div className={s.divider} />
                <div className={s.row}>
                  <span className={s.rowLabel}>To</span>
                  <CopyRow value={transaction.to} />
                </div>
              </>
            )}
            {renderCommonRows()}
          </div>

          <ExplorerButton />
        </div>
      </>
    );
  }

  // ── Batch Transaction ────────────────────────────────────────────────────────

  if (isBatchTx) {
    const batchItems = Array.isArray(transaction.transactionsData)
      ? transaction.transactionsData
      : [];

    return (
      <>
        <PageTitle title={pageTitle} />
        {refreshing && <div className={s.refreshingBar} />}
        <div className={s.container}>
          <div className={s.hero}>
            <div
              className={s.iconCircle}
              style={{backgroundColor: '#e8eaf6', color: '#5c6bc0'}}>
              <LayersIcon />
            </div>
            <span className={s.txType}>Batch Transaction</span>
            <span className={s.heroSubLabel}>
              {batchItems.length} transaction
              {batchItems.length !== 1 ? 's' : ''}
            </span>
            <StatusBadge />
          </div>

          {batchItems.length > 0 && (
            <div className={s.batchCard}>
              <p className={s.cardTitle}>Transactions</p>
              {batchItems.map((item, index) => {
                const coinInfo = item?.coinInfo;
                const tData = item?.transferData;
                return (
                  <div key={`batch_item_${index}`}>
                    <div className={s.divider} />
                    <div className={s.batchItem}>
                      <div className={s.batchItemRow}>
                        <span className={s.batchItemCoin}>
                          {coinInfo?.name
                            ? `${coinInfo.name} (${coinInfo.symbol})`
                            : coinInfo?.symbol || '—'}
                        </span>
                        <span className={s.batchItemAmount}>
                          {tData?.amount || '0'} {coinInfo?.symbol || ''}
                        </span>
                      </div>
                      {!!tData?.to && (
                        <span className={s.batchItemTo}>
                          To: {truncateAddress(tData.to)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={s.card}>
            <p className={s.cardTitle}>Transaction Details</p>
            {renderCommonRows()}
          </div>

          <ExplorerButton />
        </div>
      </>
    );
  }

  // ── Staking ──────────────────────────────────────────────────────────────────

  if (isStakingTx) {
    const isPositive =
      transaction?.isCreateStaking || transaction?.isStakingRewards;
    const stakingIconBg = isPositive ? '#e8f7e0' : '#fff3e0';
    const stakingIconColor = isPositive ? '#71C441' : '#FF9800';
    const StakingIcon = transaction?.isCreateStaking
      ? ContractCall
      : transaction?.isWithdrawStaking
        ? ContractCall
        : transaction?.isDeactivateStaking
          ? PowerIcon
          : ContractCall;
    const amountColor = isPositive ? '#71C441' : '#FF9800';

    return (
      <>
        <PageTitle title={pageTitle} />
        {refreshing && <div className={s.refreshingBar} />}
        <div className={s.container}>
          <div className={s.hero}>
            <div
              className={s.iconCircle}
              style={{backgroundColor: stakingIconBg, color: stakingIconColor}}>
              <StakingIcon />
            </div>
            <span className={s.txType}>{stakingLabel}</span>
            {!!transaction.amount && (
              <span className={s.amount} style={{color: amountColor}}>
                {transaction.amount} {currentCoin?.symbol}
              </span>
            )}
            {transaction.totalCourse != null && (
              <span className={s.fiatAmount}>
                {currencySymbol[localCurrency]}
                {transaction.totalCourse}
              </span>
            )}
            <StatusBadge />
          </div>

          <div className={s.card}>
            <p className={s.cardTitle}>Transaction Details</p>
            {!!currentCoin?.chain_display_name && (
              <>
                <div className={s.divider} />
                <div className={s.row}>
                  <span className={s.rowLabel}>Chain</span>
                  <span className={s.rowValue}>
                    {currentCoin.chain_display_name}
                  </span>
                </div>
              </>
            )}
            {!!currentCoin?.name && (
              <>
                <div className={s.divider} />
                <div className={s.row}>
                  <span className={s.rowLabel}>Asset</span>
                  <span className={s.rowValue}>
                    {currentCoin.name} ({currentCoin.symbol})
                  </span>
                </div>
              </>
            )}
            {!!transaction.from && (
              <>
                <div className={s.divider} />
                <div className={s.row}>
                  <span className={s.rowLabel}>From</span>
                  <CopyRow value={transaction.from} />
                </div>
              </>
            )}
            {!!transaction.validatorPubKey && (
              <>
                <div className={s.divider} />
                <div className={s.row}>
                  <span className={s.rowLabel}>Validator Address</span>
                  <CopyRow value={transaction.validatorPubKey} />
                </div>
              </>
            )}
            {!!transaction.validatorName && (
              <>
                <div className={s.divider} />
                <div className={s.row}>
                  <span className={s.rowLabel}>Validator Name</span>
                  <span className={s.rowValue}>
                    {transaction.validatorName}
                  </span>
                </div>
              </>
            )}
            {!!transaction.resourceType && (
              <>
                <div className={s.divider} />
                <div className={s.row}>
                  <span className={s.rowLabel}>Resource Type</span>
                  <span className={s.rowValue}>{transaction.resourceType}</span>
                </div>
              </>
            )}
            {renderCommonRows()}
          </div>

          <ExplorerButton />
        </div>
      </>
    );
  }

  // ── Vote Staking ─────────────────────────────────────────────────────────────

  if (isVoteTx) {
    const displayValidators = Array.isArray(transaction.displayValidators)
      ? transaction.displayValidators
      : [];

    return (
      <>
        <PageTitle title={pageTitle} />
        {refreshing && <div className={s.refreshingBar} />}
        <div className={s.container}>
          <div className={s.hero}>
            <div
              className={s.iconCircle}
              style={{backgroundColor: '#e3f2fd', color: '#1976D2'}}>
              <VoteIcon />
            </div>
            <span className={s.txType}>Votes Submitted</span>
            {displayValidators.length > 0 && (
              <span className={s.heroSubLabel}>
                {displayValidators.length} validator
                {displayValidators.length !== 1 ? 's' : ''}
              </span>
            )}
            <StatusBadge />
          </div>

          {displayValidators.length > 0 && (
            <div className={s.batchCard}>
              <p className={s.cardTitle}>Validators</p>
              {displayValidators.map((item, index) => (
                <div key={`validator_${index}`}>
                  <div className={s.divider} />
                  <div className={s.validatorItem}>
                    <div className={s.validatorItemRow}>
                      <span className={s.validatorItemName}>
                        {item?.name || truncateAddress(item?.validatorAddress)}
                      </span>
                      <span className={s.validatorItemVotes}>
                        {item?.votes} votes
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={s.card}>
            <p className={s.cardTitle}>Transaction Details</p>
            {!!transaction.from && (
              <>
                <div className={s.divider} />
                <div className={s.row}>
                  <span className={s.rowLabel}>From</span>
                  <CopyRow value={transaction.from} />
                </div>
              </>
            )}
            {renderCommonRows()}
          </div>

          <ExplorerButton />
        </div>
      </>
    );
  }

  // ── Regular (Send / Receive) ─────────────────────────────────────────────────

  const iconBgColor = isReceived ? '#e8f7e0' : '#fdecea';
  const iconColor = isReceived ? '#71C441' : '#FF4444';
  const amountColor = isReceived ? '#71C441' : '#FF4444';

  return (
    <>
      <PageTitle title={pageTitle} />
      {refreshing && <div className={s.refreshingBar} />}
      <div className={s.container}>
        <div className={s.hero}>
          <div
            className={s.iconCircle}
            style={{backgroundColor: iconBgColor, color: iconColor}}>
            {isReceived ? <ReceiveIcon /> : <SendIcon />}
          </div>
          <span className={s.txType}>{isReceived ? 'Received' : 'Sent'}</span>
          <span className={s.amount} style={{color: amountColor}}>
            {isReceived ? '+' : '-'}
            {transaction.amount} {currentCoin?.symbol}
          </span>
          {transaction.totalCourse != null && (
            <span className={s.fiatAmount}>
              {currencySymbol[localCurrency]}
              {transaction.totalCourse}
            </span>
          )}
          <StatusBadge />
        </div>

        <div className={s.card}>
          <p className={s.cardTitle}>Transaction Details</p>
          {!!transaction.from && (
            <>
              <div className={s.divider} />
              <div className={s.row}>
                <span className={s.rowLabel}>From</span>
                <CopyRow value={transaction.from} />
              </div>
            </>
          )}
          {!!transaction.to && (
            <>
              <div className={s.divider} />
              <div className={s.row}>
                <span className={s.rowLabel}>To</span>
                <CopyRow value={transaction.to} />
              </div>
            </>
          )}
          {renderCommonRows()}
        </div>

        <ExplorerButton />
      </div>
    </>
  );
};

export default TransactionDetails;
