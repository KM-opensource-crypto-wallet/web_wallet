import React, {useState, useEffect, useRef, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styles from 'components/ModalAddCoins/ModalAddCoins.module.css';
import {CloseIcon, SearchIcon} from 'components/Home/HomeIcons';
import {reportThunkRejection} from 'utils/thunkErrors';
import {
  fetchAllCoins,
  fetchAllSearchCoinsGroup,
  fetchAllSearchCoinsGroupWithDebounce,
  fetchAllSearchCoinsWithDebounce,
  fetchGroupCoins,
  setSearchAllCoinsLoading,
  setSearchGroupCoinsLoading,
} from 'dok-wallet-blockchain-networks/redux/currency/currencySlice';
import {
  isAllGroupCoinAvailable,
  isGroupCoinsLoading,
  isSearchAllGroupCoinsLoading,
  isSearchIsAllGroupCoinAvailable,
  selectAllCoinsGroup,
  selectSearchAllCoinsGroup,
} from 'dok-wallet-blockchain-networks/redux/currency/currencySelectors';
import Loading from 'components/Loading';
import CryptoGroupList from 'components/CryptoGroupList/CryptoGroupList';
import InfiniteScroll from 'react-infinite-scroller';

const TabAddCoinsGroup = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const allCoinGroups = useSelector(selectAllCoinsGroup);
  const searchAllCoinGroups = useSelector(selectSearchAllCoinsGroup);
  const isAvailable = useSelector(isAllGroupCoinAvailable);
  const isSearchGroupCoinsAvailable = useSelector(
    isSearchIsAllGroupCoinAvailable,
  );
  const isAllCoinLoading = useSelector(isGroupCoinsLoading);
  const isSearchAllGroupCoinLoading = useSelector(isSearchAllGroupCoinsLoading);
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
    dispatch(fetchGroupCoins(queryPayload.current));
  }, [dispatch]);

  const handleSearch = event => {
    const query = event.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      dispatch(setSearchGroupCoinsLoading(true));
      searchQueryPayload.current = {
        ...searchQueryPayload.current,
        page: 1,
        search: query,
      };
      dispatch(
        fetchAllSearchCoinsGroupWithDebounce(searchQueryPayload.current),
      );
    }
  };

  const onEndReached = useCallback(async () => {
    if (!isFetching.current && isAvailable && !searchQuery?.trim()) {
      isFetching.current = true;
      queryPayload.current = {
        ...queryPayload.current,
        page: queryPayload.current.page + 1,
      };
      await dispatch(fetchGroupCoins(queryPayload.current))
        .unwrap()
        .catch(reportThunkRejection({area: 'coins', op: 'fetch_groups'}));
      isFetching.current = false;
    } else if (
      !isSearchFetching.current &&
      isSearchGroupCoinsAvailable &&
      searchQuery?.trim()
    ) {
      isSearchFetching.current = true;
      searchQueryPayload.current = {
        ...searchQueryPayload.current,
        page: searchQueryPayload.current.page + 1,
        search: searchQuery.trim(),
      };
      await dispatch(fetchAllSearchCoinsGroup(searchQueryPayload.current))
        .unwrap()
        .catch(reportThunkRejection({area: 'coins', op: 'search_groups'}));
      isSearchFetching.current = false;
    }
  }, [dispatch, isAvailable, isSearchGroupCoinsAvailable, searchQuery]);

  return (
    <div className={styles.tab}>
      <label className={styles.search}>
        <SearchIcon size={17} />
        <input
          value={searchQuery}
          onChange={handleSearch}
          placeholder='Search coin groups'
          aria-label='Search coin groups'
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
      {isSearchAllGroupCoinLoading || isAllCoinLoading ? (
        <div className={styles.loader}>
          <Loading />
        </div>
      ) : (
        <div className={styles.scroll}>
          <InfiniteScroll
            initialLoad={false}
            pageStart={1}
            loadMore={onEndReached}
            hasMore={
              searchQuery?.trim() ? isSearchGroupCoinsAvailable : isAvailable
            }
            loader={
              <div className={styles.loader} key={0}>
                <Loading />
              </div>
            }
            useWindow={false}>
            <CryptoGroupList
              list={searchQuery?.trim() ? searchAllCoinGroups : allCoinGroups}
              onEndReached={onEndReached}
              contentContainerStyle={{paddingBottom: '20px'}}
            />
          </InfiniteScroll>
        </div>
      )}
    </div>
  );
};

export default TabAddCoinsGroup;
