import React, {useState, useEffect, useRef, useCallback} from 'react';
import CryptoList from 'components/CryptoList';

import styles from 'components/ModalAddCoins/ModalAddCoins.module.css';
import {CloseIcon, SearchIcon} from 'components/Home/HomeIcons';
import Loading from 'components/Loading';
import {reportThunkRejection} from 'utils/thunkErrors';
import {selectCurrentWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';

import {useSelector, useDispatch} from 'react-redux';
import {
  fetchAllCoins,
  fetchAllSearchCoins,
  fetchAllSearchCoinsWithDebounce,
  setSearchAllCoinsLoading,
} from 'dok-wallet-blockchain-networks/redux/currency/currencySlice';
import {
  isAllCoinsAvailable,
  isAllCoinsLoading,
  isSearchAllCoinsAvailable,
  isSearchAllCoinsLoading,
  selectAllCoins,
  selectSearchAllCoins,
} from 'dok-wallet-blockchain-networks/redux/currency/currencySelectors';
import InfiniteScroll from 'react-infinite-scroller';

const TabAddCoins = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const allCoins = useSelector(selectAllCoins);
  const searchAllCoins = useSelector(selectSearchAllCoins);
  const isAvailable = useSelector(isAllCoinsAvailable);
  const isSearchCoinsAvailable = useSelector(isSearchAllCoinsAvailable);
  const isAllCoinLoading = useSelector(isAllCoinsLoading);
  const isSearchAllCoinLoading = useSelector(isSearchAllCoinsLoading);
  const currentWallet = useSelector(selectCurrentWallet);
  const dispatch = useDispatch();

  const queryPayload = useRef({
    limit: 20,
    orderBy: 'order',
    order: 1,
    page: 1,
  });
  const searchQueryPayload = useRef({
    limit: 20,
    orderBy: 'order',
    order: 1,
    page: 1,
  });
  const isFetching = useRef(false);
  const isSearchFetching = useRef(false);

  useEffect(() => {
    dispatch(fetchAllCoins(queryPayload.current));
  }, [dispatch]);

  const handleSearch = event => {
    const query = event.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      dispatch(setSearchAllCoinsLoading(true));
      searchQueryPayload.current = {
        ...searchQueryPayload.current,
        page: 1,
        search: query,
      };
      dispatch(fetchAllSearchCoinsWithDebounce(searchQueryPayload.current));
    }
  };

  const onEndReached = useCallback(async () => {
    if (!isFetching.current && isAvailable && !searchQuery?.trim()) {
      isFetching.current = true;
      queryPayload.current = {
        ...queryPayload.current,
        page: queryPayload.current.page + 1,
      };
      await dispatch(fetchAllCoins(queryPayload.current))
        .unwrap()
        .catch(reportThunkRejection({area: 'coins', op: 'fetch_all'}));
      isFetching.current = false;
    } else if (
      !isSearchFetching.current &&
      isSearchCoinsAvailable &&
      searchQuery?.trim()
    ) {
      isSearchFetching.current = true;
      searchQueryPayload.current = {
        ...searchQueryPayload.current,
        page: searchQueryPayload.current.page + 1,
        search: searchQuery.trim(),
      };
      await dispatch(fetchAllSearchCoins(searchQueryPayload.current))
        .unwrap()
        .catch(reportThunkRejection({area: 'coins', op: 'search'}));
      isSearchFetching.current = false;
    }
  }, [dispatch, isAvailable, isSearchCoinsAvailable, searchQuery]);

  return (
    <div className={styles.tab}>
      <label className={styles.search}>
        <SearchIcon size={17} />
        <input
          value={searchQuery}
          onChange={handleSearch}
          placeholder='Search coins'
          aria-label='Search coins'
        />
        {searchQuery ? (
          <button
            type='button'
            className={styles.clear}
            aria-label='Clear search'
            onClick={() => setSearchQuery('')}>
            <CloseIcon size={12} />
          </button>
        ) : null}
      </label>
      {isSearchAllCoinLoading || isAllCoinLoading ? (
        <div className={styles.loader}>
          <Loading />
        </div>
      ) : (
        <div className={styles.scroll}>
          <InfiniteScroll
            initialLoad={false}
            pageStart={1}
            loadMore={onEndReached}
            hasMore={searchQuery?.trim() ? isSearchCoinsAvailable : isAvailable}
            loader={
              <div className={styles.loader} key={0}>
                <Loading />
              </div>
            }
            useWindow={false}>
            <CryptoList
              number={3}
              list={searchQuery?.trim() ? searchAllCoins : allCoins}
              showSwitch={true}
              searchText={searchQuery.trim()}
              isMoreAvailable={
                searchQuery?.trim() ? isSearchCoinsAvailable : isAvailable
              }
              currentWallet={currentWallet}
            />
          </InfiniteScroll>
        </div>
      )}
    </div>
  );
};

export default TabAddCoins;
