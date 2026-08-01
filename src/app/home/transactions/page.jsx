'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {useDispatch, useSelector} from 'react-redux';
import {
  selectCurrentCoin,
  selectTransactionsByType,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import Transactions from 'components/Transactions';
import ModalSortTransactions from 'components/ModalSortTransactions';
const copyIcon = require(`assets/images/icons`).default;
import {
  getLocalCurrency,
  getHideSmallTransactions,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {setHideSmallTransactions} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';
import s from './Transactions.module.css';
import {refreshCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import Loading from 'components/Loading';
import PageTitle from 'components/PageTitle';
import {
  getAddressDetailsUrl,
  isBitcoinChain,
  isPendingTransactionSupportedChain,
} from 'dok-wallet-blockchain-networks/helper';
import {useRouter} from 'next/navigation';

const ALL_TRANSACTION_TYPES = [
  {label: 'All', value: 'all'},
  {label: 'Regular', value: 'regular'},
  {label: 'Stake', value: 'stake'},
  {label: 'Unstake', value: 'unstake'},
  {label: 'Withdraw', value: 'withdraw'},
  {label: 'Batch', value: 'batch'},
];

function computeRenderList(
  transactions,
  hideSmallTx,
  currencyRate,
  filter,
  sort,
  mineAddress,
) {
  const list = Array.isArray(transactions) ? [...transactions] : [];
  const filtered = list.filter(tx => {
    const isRegularTx = tx?.transactionType === 'regular';
    if (hideSmallTx && isRegularTx) {
      const usdValue =
        tx.totalCourse != null
          ? parseFloat(tx.totalCourse)
          : parseFloat(tx.amount) * (currencyRate || 0);
      if (usdValue < 1) return false;
    }
    if (!filter || filter === 'None') return true;
    if (filter === 'Received')
      return mineAddress?.toUpperCase() === tx?.to?.toUpperCase();
    if (filter === 'Send')
      return mineAddress?.toUpperCase() === tx?.from?.toUpperCase();
    if (filter === 'Pending') return tx.status?.toUpperCase() !== 'SUCCESS';
    return true;
  });
  return filtered.sort((a, b) => {
    if (sort === 'Date Ascending') return new Date(a.date) - new Date(b.date);
    if (sort === 'Amount Ascending') return Number(a.amount) - Number(b.amount);
    if (sort === 'Amount Descending')
      return Number(b.amount) - Number(a.amount);
    return new Date(b.date) - new Date(a.date);
  });
}

const ALL_ONLY_CHAINS = [
  'ton',
  'stellar',
  'aptos',
  'cardano',
  'cosmos',
  'filecoin',
  'hedera',
  'polkadot',
  'ripple',
  'tezos',
  'thorchain',
  'bitcoin_lightning',
  'litecoin',
  'dogecoin',
  'bitcoin_cash',
];

const TransactionsList = () => {
  const dispatch = useDispatch();
  const localCurrency = useSelector(getLocalCurrency);
  const currentCoin = useSelector(selectCurrentCoin);
  const hideSmallTx = useSelector(getHideSmallTransactions);

  const [modalVisible, setmodalVisible] = useState(false);
  const [filter, setFilter] = useState('None');
  const [sort, setSort] = useState('Date Descending');
  const [selectedType, setSelectedType] = useState('all');
  const [renderList, setRenderList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const router = useRouter();

  const coinId =
    currentCoin?.address + currentCoin?.name + currentCoin?.chain_name;

  const transactionsSelector = useMemo(
    () => selectTransactionsByType(selectedType),
    [selectedType],
  );
  const typedTransactions = useSelector(transactionsSelector);

  const transactionTypes = useMemo(() => {
    const chain = currentCoin?.chain_name;
    if (chain === 'tron') {
      return ALL_TRANSACTION_TYPES.filter(t => t.value !== 'batch');
    }
    if (chain === 'solana') {
      return ALL_TRANSACTION_TYPES.filter(t =>
        ['all', 'stake', 'unstake', 'withdraw'].includes(t.value),
      );
    }
    if (ALL_ONLY_CHAINS.includes(chain) || isBitcoinChain(chain)) {
      return ALL_TRANSACTION_TYPES.filter(t => t.value === 'all');
    }
    return ALL_TRANSACTION_TYPES;
  }, [currentCoin?.chain_name]);

  const isSupportUpdateTransaction = useMemo(() => {
    return (
      isPendingTransactionSupportedChain(currentCoin?.chain_name) &&
      currentCoin?.type === 'coin'
    );
  }, [currentCoin?.chain_name, currentCoin?.type]);

  const onPressUpdateTransaction = useCallback(() => {
    router.push('/home/transactions/update-transaction');
  }, [router]);

  useEffect(() => {
    if (currentCoin?.address) {
      dispatch(refreshCurrentCoin({fetchTransaction: true}))
        .unwrap()
        .then(() => {
          setIsLoading(false);
        })
        .catch(e => {
          setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinId, dispatch]);

  useEffect(() => {
    setRenderList(
      computeRenderList(
        typedTransactions,
        hideSmallTx,
        currentCoin?.currencyRate,
        filter,
        sort,
        currentCoin?.address,
      ),
    );
  }, [
    typedTransactions,
    hideSmallTx,
    currentCoin?.currencyRate,
    currentCoin?.address,
    filter,
    sort,
  ]);

  const onPressViewAll = useCallback(() => {
    const chain_name = currentCoin?.chain_name;
    const type = currentCoin?.type;
    const address = currentCoin?.address;
    if (chain_name && type && address) {
      const url = getAddressDetailsUrl(chain_name, type, address);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  }, [currentCoin?.address, currentCoin?.chain_name, currentCoin?.type]);

  const onPressApply = useCallback(
    (sortValue, filterValue, hideSmallTxValue) => {
      setSort(sortValue);
      setFilter(filterValue);
      dispatch(setHideSmallTransactions(hideSmallTxValue));
    },
    [dispatch],
  );

  const onPressTypeTab = useCallback(value => {
    setSelectedType(value);
    setSort('Date Descending');
    setFilter('None');
  }, []);

  return (
    <>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <PageTitle title='Transaction History' />
          <div className={s.viewAllTransactionContainer}>
            <div>
              <div className={s.rowView}>
                <p className={s.titleTrans}>Transactions</p>
                {isSupportUpdateTransaction && (
                  <button
                    className={s.viewButton}
                    onClick={onPressUpdateTransaction}>
                    <p className={s.viewButtonText}>{'Update transaction'}</p>
                  </button>
                )}
              </div>
              <div className={s.rowView}>
                <button
                  className={s.subtitleRow}
                  onClick={() => setShowInfo(v => !v)}>
                  <p className={s.address}>Your last 20 transactions</p>
                  <span className={s.infoIcon}>
                    <InfoOutlinedIcon style={{fontSize: 16}} />
                  </span>
                </button>
                <button className={s.viewButton} onClick={onPressViewAll}>
                  <p className={s.viewButtonText}>{'View all'}</p>
                </button>
              </div>
              {showInfo && (
                <div className={s.infoCard}>
                  <p className={s.infoCardTitle}>
                    Why am I missing transactions?
                  </p>
                  <p className={s.infoCardLine}>
                    {'• '}
                    <span className={s.infoCardBold}>Only the last 20</span>
                    {' transactions are fetched from the network.'}
                  </p>
                  <p className={s.infoCardLine}>
                    {'• '}
                    <span className={s.infoCardBold}>
                      Small transactions ({'<'}$1)
                    </span>
                    {' may be hidden. Toggle in '}
                    <button
                      className={s.infoCardLink}
                      onClick={() => setmodalVisible(true)}>
                      Sort &amp; Filter
                    </button>
                    {'.'}
                  </p>
                  <p className={s.infoCardLine}>
                    {'• A '}
                    <span className={s.infoCardBold}>status filter</span>
                    {' may be active.'}
                  </p>
                  <p className={s.infoCardLine}>
                    {'• '}
                    <button className={s.infoCardLink} onClick={onPressViewAll}>
                      View all
                    </button>
                    {' transactions on the explorer.'}
                  </p>
                </div>
              )}
            </div>

            {transactionTypes.length > 1 && (
              <div className={s.typeFilterRow}>
                {transactionTypes.map(item => (
                  <button
                    key={item.value}
                    className={
                      selectedType === item.value
                        ? s.typeFilterTabActive
                        : s.typeFilterTab
                    }
                    onClick={() => onPressTypeTab(item.value)}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div className={s.borderBox}>
              <div className={s.sortList}>
                <div>
                  <p className={s.sortTitle}>
                    Sort by: <span className={s.titleItem}>{sort}</span>
                  </p>
                  {filter !== 'None' && (
                    <p className={s.sortTitle}>
                      Filter by: <span className={s.titleItem}>{filter}</span>
                    </p>
                  )}
                </div>
                <button onClick={() => setmodalVisible(true)}>
                  <div style={{fill: 'var(--font)'}}>{copyIcon.filter}</div>
                </button>
              </div>
            </div>
            <Transactions
              renderList={renderList}
              currentCoin={currentCoin}
              localCurrency={localCurrency}
            />
            <ModalSortTransactions
              visible={modalVisible}
              hideModal={() => setmodalVisible(false)}
              onPressAppy={onPressApply}
              initialHideSmallTx={hideSmallTx}
              initialSort={sort}
              initialFilter={filter}
            />
          </div>
        </>
      )}
    </>
  );
};

export default TransactionsList;
