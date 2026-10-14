'use client';
import React, {useCallback} from 'react';
import styles from './VoteStaking.module.css';
import useStaking from 'src/hooks/protectedRoutes/wallet/home/send/useStaking';
import Loading from 'components/Loading';
import ValidatorItem from 'components/ValidatorItem';

import GeneralButton from 'components/Button';
import {
  ChevronLeftIcon,
  CloseIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import InfiniteScroll from 'react-infinite-scroller';
import useNavigation from 'src/hooks/navigation/useNavigation';

const VoteStaking = () => {
  const {
    isLoading,
    voteValidatorsList: validatorsList,
    hasMoreValidators,
    voteSearchQuery: searchQuery,
    handleVoteSearch: handleSearch,
    clearVoteSearch: clearSearch,
    onVoteEndReached: onEndReached,
    selectedVotes,
    selectedTotal,
    voteAvailableAmount: availableAmount,
    onPressAdd,
    onPressMinus,
    onChangeText,
    isVoteValid: isValid,
    handleVoteSubmit: handleSubmitForm,
  } = useStaking('vote');
  const {goBack} = useNavigation();

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
        onClick={goBack}>
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
            hasMore={hasMoreValidators}
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
