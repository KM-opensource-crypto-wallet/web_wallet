import React, {useState, useEffect, useRef, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styles from './TabAddCoinsGroup.module.css';
import {reportThunkRejection} from 'utils/thunkErrors';
import {TextField, IconButton} from '@mui/material';
import {Search as SearchIcon, Clear as ClearIcon} from '@mui/icons-material';
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
    <div className={styles.tabContent}>
      <TextField
        className={styles.search}
        placeholder='Search'
        variant='outlined'
        id='search-bar'
        fullWidth
        value={searchQuery}
        onChange={handleSearch}
        sx={{
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
            {
              borderColor: 'var(--gray)',
            },
          '& .MuiOutlinedInput-root': {
            border: '1px solid var(--gray)',
            borderRadius: '10px',
            marginTop: '10px',
            marginBottom: '10px',
            fontSize: '18px',
          },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <IconButton type='submit' aria-label='search'>
                <SearchIcon sx={{color: 'gray', marginRight: '10px'}} />
              </IconButton>
            ),
            endAdornment: searchQuery && (
              <IconButton
                onClick={() => setSearchQuery('')}
                size='small'
                sx={{color: 'gray'}}>
                <ClearIcon />
              </IconButton>
            ),
          },
        }}
      />
      {isSearchAllGroupCoinLoading || isAllCoinLoading ? (
        <Loading />
      ) : (
        <div className={styles.scrollModalDiv}>
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
