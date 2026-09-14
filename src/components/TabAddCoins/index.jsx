import React, {useState, useEffect, useRef, useCallback} from 'react';
import CryptoList from 'components/CryptoList';

const icons = require(`assets/images/icons`).default;
import styles from './TabAddCoins.module.css';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
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
      {isSearchAllCoinLoading || isAllCoinLoading ? (
        <Loading />
      ) : (
        <div className={styles.scrollModalDiv}>
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
