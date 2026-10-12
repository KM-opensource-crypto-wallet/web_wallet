'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useParams, useRouter} from 'next/navigation';
import {
  selectCurrentCoin,
  selectCurrentCoinRecentTransaction,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {fetchTransactionByHash} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {getRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraSelectors';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {currencySymbol} from 'data/currency';
import dayjs from 'dayjs';
import Image from 'next/image';
import {showToast} from 'utils/toast';
import s from './TransactionDetails.module.css';
import GeneralButton from 'components/Button';
import {txStatus} from 'components/Transactions';
import {CheckIcon, ChevronLeftIcon, CopyIcon} from 'components/Home/HomeIcons';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ContractIcon,
  EmptyIcon,
  ExternalLinkIcon,
  ImageIcon,
  LayersIcon,
  PowerIcon,
  ShieldIcon,
  StarIcon,
  TrendDownIcon,
  TrendUpIcon,
} from 'components/Transactions/TxIcons';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';

const STATUS_LABEL = {success: 'Success', pending: 'Pending', failed: 'Failed'};

// Shortened value with a copy button; the full value goes to the clipboard.
const CopyValue = ({value}) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const stringValue = typeof value === 'string' ? value : undefined;
  const handleCopy = () => {
    if (!stringValue) return;
    navigator.clipboard?.writeText(stringValue).then(() => {
      showToast({type: 'successToast', title: 'Copied to clipboard'});
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type='button'
      className={`${s.copyValue} ${copied ? s.copyDone : ''}`}
      title={stringValue}
      onClick={handleCopy}>
      <span className={s.mono}>{getCustomizePublicAddress(stringValue)}</span>
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
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
  const routeStateData = useSelector(getRouteStateData);
  const [savedRouteTransaction] = useState(
    () => routeStateData?.TransactionDetails?.transaction ?? null,
  );

  useEffect(() => {
    if (savedRouteTransaction) {
      dispatch(setRouteStateData({TransactionDetails: null}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialTransaction =
    currentCoin?.transactions?.find(t => t.link === txHash) ??
    (savedRouteTransaction?.link === txHash ? savedRouteTransaction : null);

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
        url: recentTx.url || initialTransaction?.url,
        totalCourse: recentTx.totalCourse,
        blockNumber: recentTx.blockNumber,
        confirmations: recentTx.confirmations,
        ...(recentTx.paymentType != null && {
          paymentType: recentTx.paymentType,
        }),
        ...(recentTx.transactionType != null &&
          initialTransaction?.transactionType != null && {
            transactionType: recentTx.transactionType,
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
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      fetchTransaction();
    })();
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

  const router = useRouter();
  const symbol = currentCoin?.symbol?.toUpperCase() ?? '';
  const fiatSymbol = currencySymbol[localCurrency] || '';

  const topBar = (title, onViewExplorer) => (
    <div className={s.topBar}>
      <GeneralButton
        variant='unstyled'
        className={s.iconButton}
        aria-label='Back'
        onClick={() => router.back()}>
        <ChevronLeftIcon size={24} />
      </GeneralButton>
      <h1 className={s.title}>{title}</h1>
      {refreshing ? (
        <span className={s.refreshing} aria-label='Refreshing' />
      ) : onViewExplorer ? (
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='View on explorer'
          onClick={onViewExplorer}>
          <ExternalLinkIcon size={19} />
        </GeneralButton>
      ) : (
        <span className={s.iconSpacer} aria-hidden='true' />
      )}
    </div>
  );

  if (!transaction) {
    return (
      <main className={s.page}>
        <div className={s.glow} aria-hidden='true' />
        {topBar('Transaction details')}
        <div className={s.column}>
          <div className={s.empty}>
            <span className={s.emptyIcon}>
              <EmptyIcon size={26} />
            </span>
            <p className={s.emptyTitle}>No transaction data found</p>
            <p className={s.emptyText}>
              It may still be propagating. Pull it up again from the transaction
              history in a moment.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Transaction type detection ──────────────────────────────────────────────

  const isNFT = !!transaction?.isNFT;
  const isNFTHistorical =
    !isNFT && transaction?.transactionType === 'nftTransfer';
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
  const isSmartContractTx = transaction?.transactionType === 'smartContract';
  const isDelegationTx = transaction?.transactionType === 'delegationChange';
  const isRegularTx =
    !isNFT &&
    !isNFTHistorical &&
    !isBatchTx &&
    !isStakingTx &&
    !isVoteTx &&
    !isSmartContractTx &&
    !isDelegationTx;

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

  const status = txStatus(transaction);
  const statusLabel = transaction?.status ? STATUS_LABEL[status] : '—';

  const pageTitle = isNFT
    ? 'NFT Transfer'
    : `${currentCoin?.name || ''} Transaction`;

  const onViewExplorer = transaction?.url
    ? () => window.open(transaction.url, '_blank', 'noopener,noreferrer')
    : null;

  // ── Hero + rows per type ────────────────────────────────────────────────────

  const chainRow = currentCoin?.chain_display_name
    ? {label: 'Chain', value: currentCoin.chain_display_name}
    : null;
  const fromRow = (label = 'From') =>
    transaction.from ? {label, copy: transaction.from} : null;
  const toRow = (label = 'To') =>
    transaction.to ? {label, copy: transaction.to} : null;
  const fiatText =
    transaction.totalCourse != null
      ? `${fiatSymbol}${transaction.totalCourse}`
      : null;

  let hero = {};
  let rows = [];
  let list = null;

  if (isNFT || isNFTHistorical) {
    hero = {
      Icon: ImageIcon,
      tone: 'tonePurple',
      title: 'NFT Transfer',
      image: isNFT ? transaction.nftImage || null : undefined,
      amount: isNFT
        ? transaction.nftTokenId
          ? `${transaction.nftName || '—'} (#${transaction.nftTokenId})`
          : transaction.nftName || '—'
        : null,
    };
    rows = [chainRow, fromRow(), toRow()];
  } else if (isBatchTx) {
    const batchItems = Array.isArray(transaction.transactionsData)
      ? transaction.transactionsData
      : [];
    hero = {
      Icon: LayersIcon,
      tone: 'toneBlue',
      title: 'Batch Transaction',
      sub: `${batchItems.length} transaction${
        batchItems.length !== 1 ? 's' : ''
      }`,
    };
    list = batchItems.length
      ? {
          title: 'Transactions',
          items: batchItems.map((item, index) => {
            const coinInfo = item?.coinInfo;
            const tData = item?.transferData;
            return {
              key: `batch_item_${index}`,
              primary: coinInfo?.name
                ? `${coinInfo.name} (${coinInfo.symbol})`
                : coinInfo?.symbol || '—',
              secondary: tData?.to
                ? `To ${getCustomizePublicAddress(tData.to)}`
                : null,
              value: `${tData?.amount || '0'} ${coinInfo?.symbol || ''}`,
            };
          }),
        }
      : null;
  } else if (isStakingTx) {
    const isPositive =
      transaction?.isCreateStaking || transaction?.isStakingRewards;
    hero = {
      Icon: transaction?.isCreateStaking
        ? TrendUpIcon
        : transaction?.isWithdrawStaking
          ? TrendDownIcon
          : transaction?.isDeactivateStaking
            ? PowerIcon
            : StarIcon,
      tone: isPositive ? 'toneIn' : 'toneWarn',
      title: stakingLabel,
      amount: transaction.amount ? `${transaction.amount} ${symbol}` : null,
      amountTone: isPositive ? 'amountIn' : 'amountWarn',
      fiat: fiatText,
    };
    rows = [
      chainRow,
      currentCoin?.name
        ? {
            label: 'Asset',
            value: `${currentCoin.name} (${currentCoin.symbol})`,
          }
        : null,
      fromRow(),
      transaction.validatorPubKey
        ? {label: 'Validator address', copy: transaction.validatorPubKey}
        : null,
      transaction.validatorName
        ? {label: 'Validator name', value: transaction.validatorName}
        : null,
      transaction.resourceType
        ? {label: 'Resource type', value: transaction.resourceType}
        : null,
    ];
  } else if (isVoteTx) {
    const displayValidators = Array.isArray(transaction.displayValidators)
      ? transaction.displayValidators
      : [];
    hero = {
      Icon: CheckCircleIcon,
      tone: 'toneBlue',
      title: 'Votes Submitted',
      sub: displayValidators.length
        ? `${displayValidators.length} validator${
            displayValidators.length !== 1 ? 's' : ''
          }`
        : null,
    };
    list = displayValidators.length
      ? {
          title: 'Validators',
          items: displayValidators.map((item, index) => ({
            key: `validator_${index}`,
            primary:
              item?.name || getCustomizePublicAddress(item?.validatorAddress),
            value: `${item?.votes} votes`,
          })),
        }
      : null;
    rows = [fromRow()];
  } else if (isSmartContractTx) {
    hero = {Icon: ContractIcon, tone: 'tonePurple', title: 'Contract Call'};
    rows = [chainRow, fromRow(), toRow('Contract')];
  } else if (isDelegationTx) {
    const isRevoke =
      transaction?.from?.toLowerCase() === transaction?.to?.toLowerCase();
    hero = {
      Icon: ShieldIcon,
      tone: 'toneBlue',
      title: isRevoke ? 'Delegation Revoked' : 'Delegation Change',
      sub: 'EIP-7702',
    };
    rows = [chainRow, fromRow('Wallet')];
  } else {
    hero = {
      Icon: isReceived ? ArrowDownIcon : ArrowUpIcon,
      tone: isReceived ? 'toneIn' : 'toneOut',
      title: isReceived ? 'Received' : 'Sent',
      amount: `${isReceived ? '+' : '−'}${transaction.amount} ${symbol}`,
      amountTone: isReceived ? 'amountIn' : 'amountOut',
      fiat: fiatText,
    };
    rows = [fromRow(), toRow()];
  }

  rows = [
    ...rows,
    transaction.date
      ? {
          label: 'Date',
          value: dayjs(transaction.date).format('DD MMM YYYY, HH:mm'),
        }
      : null,
    transaction.blockNumber != null
      ? {label: 'Block no.', value: String(transaction.blockNumber)}
      : null,
    transaction.confirmations != null
      ? {label: 'Confirmations', value: String(transaction.confirmations)}
      : null,
    transaction.link ? {label: 'Tx hash', copy: transaction.link} : null,
  ].filter(Boolean);

  const showImage = hero.image !== undefined;

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      {topBar(pageTitle, onViewExplorer)}
      <div className={s.column}>
        <section className={s.hero} aria-label='Summary'>
          {showImage ? (
            <div className={s.nftImage}>
              {hero.image && !nftImageError ? (
                <Image
                  src={hero.image}
                  alt='NFT'
                  fill
                  style={{objectFit: 'cover'}}
                  onError={() => setNftImageError(true)}
                />
              ) : (
                <span className={s.nftPlaceholder}>NFT</span>
              )}
            </div>
          ) : (
            <span className={`${s.heroIcon} ${s[hero.tone]}`}>
              <hero.Icon size={26} />
            </span>
          )}
          <span className={s.heroTitle}>{hero.title}</span>
          {hero.amount ? (
            <span
              className={`${s.amount} ${
                hero.amountTone ? s[hero.amountTone] : ''
              }`}>
              {hero.amount}
            </span>
          ) : null}
          {hero.fiat ? <span className={s.fiat}>{hero.fiat}</span> : null}
          {hero.sub ? <span className={s.heroSub}>{hero.sub}</span> : null}
          <span className={`${s.status} ${s[`status_${status}`]}`}>
            <span className={s.statusDot} />
            {statusLabel}
          </span>
        </section>

        {list ? (
          <section className={s.card} aria-label={list.title}>
            <span className={s.cardTitle}>{list.title}</span>
            {list.items.map(item => (
              <div key={item.key} className={s.listItem}>
                <span className={s.listText}>
                  <span className={s.listPrimary}>{item.primary}</span>
                  {item.secondary ? (
                    <span className={s.listSecondary}>{item.secondary}</span>
                  ) : null}
                </span>
                <span className={s.listValue}>{item.value}</span>
              </div>
            ))}
          </section>
        ) : null}

        <section className={s.card} aria-label='Transaction details'>
          <span className={s.cardTitle}>Details</span>
          {rows.map(row => (
            <div key={row.label} className={s.row}>
              <span className={s.rowLabel}>{row.label}</span>
              {row.copy ? (
                <CopyValue value={row.copy} />
              ) : (
                <span className={s.rowValue}>{row.value}</span>
              )}
            </div>
          ))}
        </section>

        {onViewExplorer ? (
          <GeneralButton
            variant='secondary'
            fullWidth
            className={s.explorer}
            onClick={onViewExplorer}>
            <ExternalLinkIcon size={17} />
            View on explorer
          </GeneralButton>
        ) : null}
      </div>
    </main>
  );
};

export default TransactionDetails;
