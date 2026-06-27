'use client';
import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {useSelector} from 'react-redux';
import {useDispatch} from 'react-redux';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import Loading from 'components/Loading';
// import StakingItem from 'components/StakingItem';
import {refreshCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import styles from './StakingList.module.css';
import StakingItem from 'components/StakingItem';
import {useRouter} from 'next/navigation';
import PageTitle from 'components/PageTitle';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {setSelectedVotes} from 'dok-wallet-blockchain-networks/redux/staking/stakingSlice';
import {
  isEVMChain,
  isShowUnstakingButton,
  isShowVoteButton,
  isSupportEpochTime,
  multiplyBNWithFixed,
} from 'dok-wallet-blockchain-networks/helper';

const StakingList = () => {
  const router = useRouter();
  const currentCoin = useSelector(selectCurrentCoin);
  const staking = Array.isArray(currentCoin?.staking)
    ? currentCoin?.staking
    : [];
  const stakingInfo = useMemo(() => {
    return Array.isArray(currentCoin?.stakingInfo)
      ? currentCoin?.stakingInfo
      : [];
  }, [currentCoin?.stakingInfo]);

  const unstakingDisableText = useMemo(() => {
    return stakingInfo.find(item => item.label === 'disabled_unstaking')?.value;
  }, [stakingInfo]);

  const isShowUnstaking = isShowUnstakingButton(currentCoin?.chain_name);
  const isEvmChain = isEVMChain(currentCoin?.chain_name);
  const isShowVote = isShowVoteButton(currentCoin?.chain_name);

  const estimateEpochTimestamp = useMemo(() => {
    const isEpochTime = isSupportEpochTime(currentCoin?.chain_name);
    const tempStakingInfo = Array.isArray(currentCoin?.stakingInfo)
      ? currentCoin?.stakingInfo
      : [];
    if (isEpochTime) {
      return tempStakingInfo?.find(item => item?.label === 'Epoch ends in')
        ?.value;
    }
    return null;
  }, [currentCoin?.chain_name, currentCoin?.stakingInfo]);
  const [isLoading, setIsLoading] = useState(true);

  const dispatch = useDispatch();

  useEffect(() => {
    if (currentCoin?.address) {
      dispatch(refreshCurrentCoin({isFetchStaking: true}))
        .unwrap()
        .then(() => {
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPressBoxItem = useCallback(
    (buttonTitle, buttonValue) => {
      const fiatAmount = multiplyBNWithFixed(
        buttonValue,
        currentCoin?.currencyRate,
        2,
      );
      const payload = {
        withdrawStaking: {
          selectedStake: {
            amount: buttonValue,
            fiatAmount,
          },
          ...(buttonTitle === 'Withdraw'
            ? {isWithdrawStaking: true}
            : {isStakingRewards: true}),
          hideResource: true,
        },
      };
      dispatch(setRouteStateData(payload));
      router.push('/home/withdraw-staking');
    },
    [currentCoin?.currencyRate, dispatch, router],
  );
  const handleClaimReward = useCallback(
    (rewardAmount, item) => {
      const fiatAmount = multiplyBNWithFixed(
        rewardAmount,
        currentCoin?.currencyRate,
        2,
      );
      const payload = {
        withdrawStaking: {
          selectedStake: {
            validatorInfo: item?.validatorInfo,
            validator_address: item?.validator_address,
            staking_address: item?.staking_address,
            amount: rewardAmount,
            fiatAmount,
          },
          isStakingRewards: true,
          hideResource: true,
        },
      };
      dispatch(setRouteStateData(payload));
      router.push('/home/withdraw-staking');
    },
    [currentCoin?.currencyRate, dispatch, router],
  );

  const renderBoxItem = (title, value, buttonLabel, buttonValue, type) => {
    if (type === 'hidden') {
      return null;
    }
    return (
      <div className={styles.itemView} key={title}>
        <div className={styles.title}>{title}</div>
        <div className={styles.rightItemView}>
          <div className={styles.boxBalance}>{value}</div>
          {!!buttonLabel && (
            <button
              className={styles.buttonStyle}
              onClick={() => {
                onPressBoxItem(buttonLabel, buttonValue);
              }}>
              {buttonLabel}
            </button>
          )}
        </div>
      </div>
    );
  };
  if (!currentCoin) {
    return null;
  }

  return (
    <>
      {isLoading ? (
        <Loading />
      ) : (
        <div>
          <PageTitle title='Staking List' />
          <div className={styles.box}>
            {renderBoxItem(
              'Available Balance',
              `${currentCoin?.totalAmount} ${currentCoin?.symbol}`,
            )}
            {stakingInfo.map(item =>
              renderBoxItem(
                item.label,
                `${item.value}`,
                item.buttonLabel,
                item.buttonValue,
                item.type,
              ),
            )}
          </div>
          <div className={styles.createStakingWrapper}>
            <button
              className={styles.button}
              onClick={() => {
                router.push('/home/create-staking');
              }}>
              Create Staking
            </button>
            {isShowVote && (
              <button
                className={styles.button}
                onClick={() => {
                  dispatch(setSelectedVotes(null));
                  router.push('/home/vote-staking');
                }}>
                Validators
              </button>
            )}
            {isShowUnstaking && !isEvmChain && (
              <button
                className={styles.button}
                style={
                  !!unstakingDisableText
                    ? {
                        backgroundColor: 'var(--gray)',
                        marginBottom: '4px',
                      }
                    : {}
                }
                disabled={!!unstakingDisableText}
                onClick={() => {
                  const payload = {
                    withdrawStaking: {
                      isDeactivateStaking: true,
                    },
                  };
                  dispatch(setRouteStateData(payload));
                  router.push('/home/withdraw-staking');
                }}>
                Unstaking
              </button>
            )}
          </div>
          {!!unstakingDisableText && (
            <p className={styles.errorTitle}>{unstakingDisableText}</p>
          )}
          <div className={styles.stakingTitle}>Active Staking</div>
          <div className={styles.stakingItemWrapper}>
            {staking?.map((item, index) => (
              <StakingItem
                key={'stakingItem' + index}
                item={item}
                isWithdraw={true}
                estimateEpochTimestamp={estimateEpochTimestamp}
                showReward={true}
                handleClaimReward={handleClaimReward}
                isEvmChain={isEvmChain}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default StakingList;
