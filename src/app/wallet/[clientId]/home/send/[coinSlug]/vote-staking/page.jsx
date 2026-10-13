'use client';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from './VoteStaking.module.css';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';

import {ThemeContext} from 'theme/ThemeContext';

import {
  calculateEstimateFee,
  updateCurrentTransferData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {validateNumber} from 'dok-wallet-blockchain-networks/helper';
import {
  fetchValidatorByChain,
  onAddVotes,
  onChangeVotes,
  onMinusVotes,
} from 'dok-wallet-blockchain-networks/redux/staking/stakingSlice';
import {
  countSelectedVotes,
  getSelectedVotes,
  getStakingLoading,
  getStakingValidatorsByChain,
} from 'dok-wallet-blockchain-networks/redux/staking/stakingSelectors';
import Loading from 'components/Loading';
import {setExchangeSuccess} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';
import ValidatorItem from 'components/ValidatorItem';

import GeneralButton from 'components/Button';
import {
  ChevronLeftIcon,
  CloseIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import InfiniteScroll from 'react-infinite-scroller';
import {useRouter} from 'next/navigation';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';

const VoteStaking = () => {
  const currentCoin = useSelector(selectCurrentCoin);
  const validators = useSelector(getStakingValidatorsByChain, shallowEqual);
  const [validatorsList, setValidatorsList] = useState(validators.slice(0, 20));
  const [searchQuery, setSearchQuery] = useState('');
  const selectedVotes = useSelector(getSelectedVotes);
  const displayItemRef = useRef(20);
  const availableAmount = useMemo(() => {
    const amount = currentCoin?.stakingBalance || '0';
    const stakingBalanceNumber = validateNumber(amount);
    if (stakingBalanceNumber) {
      return Math.floor(stakingBalanceNumber);
    }
    return 0;
  }, [currentCoin]);
  const [initialSelectedVotes, setInitialSelectedVotes] = useState(null);
  const router = useRouter();
  const routes = useAppRoutes();

  useEffect(() => {
    setValidatorsList(validators.slice(0, displayItemRef.current));
  }, [validators]);

  const selectedTotal = useSelector(countSelectedVotes);

  const isLoading = useSelector(getStakingLoading);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchValidatorByChain({chain_name: currentCoin?.chain_name}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Snapshot the votes as first seen once loading is done, so Next only
  // enables after the user changes something.
  if (!isLoading && !initialSelectedVotes && selectedVotes) {
    setInitialSelectedVotes(selectedVotes);
  }

  const handleSubmitForm = async values => {
    const selectedValidators = Object.keys(selectedVotes);
    const displayValidators = [];
    const finalSelectedVotes = {};
    selectedValidators.forEach(item => {
      const tempValidator = validators.find(
        subItem => subItem?.validatorAddress === item,
      );
      if (tempValidator && selectedVotes[item]) {
        displayValidators.push({
          ...tempValidator,
          votes: selectedVotes[item],
        });
        finalSelectedVotes[item] = selectedVotes[item];
      }
    });
    dispatch(
      updateCurrentTransferData({
        selectedVotes: finalSelectedVotes,
        currentCoin,
        amount: values?.amount,
        displayValidators,
      }),
    );
    dispatch(
      calculateEstimateFee({
        isFetchNonce: true,
        fromAddress: currentCoin?.address,
        amount: values?.amount,
        selectedVotes: finalSelectedVotes,
        balance: availableAmount,
        isCreateVote: true,
      }),
    );
    dispatch(setExchangeSuccess(false));

    dispatch(
      setRouteStateData({
        transfer: {
          fromScreen: 'VoteStaking',
          isCreateStaking: false,
          isCreateVote: true,
        },
      }),
    );
    router.push(routes.coin.confirmStaking());
  };

  const handleSearch = useCallback(
    event => {
      const value = event?.target.value;
      setSearchQuery(value);
      if (value) {
        setValidatorsList(
          validators.filter(item =>
            item?.name?.toLowerCase().includes(value?.toLowerCase()),
          ),
        );
      } else {
        setValidatorsList(validators.slice(0, displayItemRef.current));
      }
    },
    [validators],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setValidatorsList(validators.slice(0, displayItemRef.current));
  }, [validators]);

  const onEndReached = useCallback(() => {
    if (!searchQuery && validatorsList.length !== validators.length) {
      displayItemRef.current += 20;
      setValidatorsList(validators.slice(0, displayItemRef.current));
    }
  }, [searchQuery, validators, validatorsList.length]);

  const onPressAdd = useCallback(
    address => {
      dispatch(onAddVotes({address}));
    },
    [dispatch],
  );

  const onPressMinus = useCallback(
    address => {
      dispatch(onMinusVotes({address}));
    },
    [dispatch],
  );

  const onChangeText = useCallback(
    (address, value) => {
      dispatch(onChangeVotes({address, value}));
    },
    [dispatch],
  );

  const renderItem = useCallback(
    ({item}) => (
      <ValidatorItem
        item={item}
        selectedVotes={selectedVotes}
        onPressAdd={onPressAdd}
        onPressMinus={onPressMinus}
        onChangeText={onChangeText}
        containerStyle={{}}
      />
    ),
    [onChangeText, onPressAdd, onPressMinus, selectedVotes],
  );

  const topBar = (
    <div className={styles.topBar}>
      <GeneralButton
        variant='unstyled'
        className={styles.back}
        aria-label='Back'
        onClick={() => router.back()}>
        <ChevronLeftIcon size={24} />
      </GeneralButton>
      <h1 className={styles.title}>{'Select Validator'}</h1>
      <span className={styles.iconSpacer} aria-hidden='true' />
    </div>
  );

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.glow} aria-hidden='true' />
        {topBar}
        <div className={styles.loading}>
          <Loading />
        </div>
      </main>
    );
  }
  const isValid =
    availableAmount >= selectedTotal &&
    JSON.stringify(initialSelectedVotes) !== JSON.stringify(selectedVotes) &&
    selectedTotal > 0;

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden='true' />
      {topBar}
      <div className={styles.column}>
        <div className={styles.search}>
          <SearchIcon size={18} className={styles.searchIcon} />
          <input
            placeholder='Search'
            id='search-bar'
            className={styles.searchInput}
            value={searchQuery}
            onChange={handleSearch}
          />
          {searchQuery && (
            <GeneralButton
              variant='unstyled'
              className={styles.clear}
              aria-label='Clear search'
              onClick={clearSearch}>
              <CloseIcon size={16} />
            </GeneralButton>
          )}
        </div>
        {/* InfiniteScroll listens to this box's scroll (useWindow={false}),
            so it keeps a fixed height. */}
        <div className={styles.scrollModalDiv}>
          <InfiniteScroll
            initialLoad={false}
            pageStart={1}
            loadMore={onEndReached}
            hasMore={validators.length !== validatorsList.length}
            loader={
              <div className={styles.loader} key={0}>
                <Loading />
              </div>
            }
            useWindow={false}>
            {validatorsList.map((item, index) => renderItem({item}))}
          </InfiniteScroll>
        </div>
        <div className={styles.bottomContainer}>
          <p className={styles.itemDescriptionTitle}>
            {'Selected / Total = '}
            <span
              className={
                styles.itemDescription
              }>{`${selectedTotal} / ${availableAmount}`}</span>
          </p>
          <GeneralButton
            fullWidth
            disabled={!isValid}
            onClick={handleSubmitForm}>
            Next
          </GeneralButton>
        </div>
      </div>
    </main>
  );
};

export default VoteStaking;
