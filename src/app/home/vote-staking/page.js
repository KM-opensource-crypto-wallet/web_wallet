'use client';
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
  setCurrentTransferData,
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

import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PageTitle from 'components/PageTitle';
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
  const isMountedRef = useRef(false);
  const initialSelectedVotes = useRef(null);
  const router = useRouter();

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

  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  useEffect(() => {
    if (
      !isLoading &&
      isMountedRef.current &&
      !initialSelectedVotes.current &&
      selectedVotes
    ) {
      initialSelectedVotes.current = selectedVotes;
    }
  }, [isLoading, selectedVotes]);

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
      setCurrentTransferData({
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
    router.push('/home/confirm-staking');
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

  if (isLoading) {
    return <Loading />;
  }
  const isValid =
    availableAmount >= selectedTotal &&
    JSON.stringify(initialSelectedVotes.current) !==
      JSON.stringify(selectedVotes) &&
    selectedTotal > 0;

  return (
    <div className={styles.container}>
      <PageTitle title={'Select Validator'} />
      <div className={styles.textInputContainer}>
        <TextField
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
              marginBottom: '10px',
              fontSize: '18px',
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <IconButton type='submit' aria-label='search'>
                  <SearchIcon
                    sx={{
                      color: 'gray',
                      marginRight: '10px',
                    }}
                  />
                </IconButton>
              ),
              endAdornment: searchQuery && (
                <IconButton
                  onClick={clearSearch}
                  size='small'
                  sx={{
                    color: 'gray',
                  }}>
                  <ClearIcon />
                </IconButton>
              ),
            },
          }}
        />
      </div>
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
        <div className={styles.bottomView}>
          <p className={styles.itemDescriptionTitle}>
            {'Selected / Total = '}
            <p
              className={
                styles.itemDescription
              }>{`${selectedTotal} / ${availableAmount}`}</p>
          </p>
        </div>
        <button
          disabled={!isValid}
          style={{
            backgroundColor: !isValid ? 'var(--gray)' : 'var(--background)',
          }}
          className={styles.button}
          onClick={handleSubmitForm}>
          <p className={styles.buttonTitle}>Next</p>
        </button>
      </div>
    </div>
  );
};

export default VoteStaking;
