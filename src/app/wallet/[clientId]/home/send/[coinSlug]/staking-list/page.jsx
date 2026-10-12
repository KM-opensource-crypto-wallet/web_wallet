'use client';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {useSelector} from 'react-redux';
import {useDispatch} from 'react-redux';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import Loading from 'components/Loading';
import {refreshCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import styles from './StakingList.module.css';
import StakingItem from 'components/StakingItem';
import {useRouter} from 'next/navigation';
import CoinIcon from 'components/CoinIcon';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon, PlusIcon} from 'components/Home/HomeIcons';
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
  const routes = useAppRoutes();
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
      router.push(routes.coin.withdrawStaking());
    },
    [currentCoin?.currencyRate, dispatch, router, routes],
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
      router.push(routes.coin.withdrawStaking());
    },
    [currentCoin?.currencyRate, dispatch, router, routes],
  );

  const renderBoxItem = (title, value, buttonLabel, buttonValue, type) => {
    if (type === 'hidden') {
      return null;
    }
    return (
      <div className={styles.row} key={title}>
        <span className={styles.rowLabel}>{title}</span>
        <span className={styles.rowRight}>
          <span className={styles.rowValue}>{value}</span>
          {!!buttonLabel && (
            <GeneralButton
              variant='chip'
              className={styles.rowAction}
              onClick={() => {
                onPressBoxItem(buttonLabel, buttonValue);
              }}>
              {buttonLabel}
            </GeneralButton>
          )}
        </span>
      </div>
    );
  };
  if (!currentCoin) {
    return null;
  }

  const symbol = currentCoin?.symbol?.toUpperCase() ?? '';

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden='true' />
      <div className={styles.topBar}>
        <GeneralButton
          variant='unstyled'
          className={styles.back}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <h1 className={styles.title}>Staking</h1>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>
      <div className={styles.column}>
        {isLoading ? (
          <div className={styles.loading}>
            <Loading />
          </div>
        ) : (
          <>
            <section className={styles.hero} aria-label='Staking overview'>
              <div className={styles.heroTop}>
                <span className={styles.coinIcon}>
                  <CoinIcon item={currentCoin} />
                </span>
                <div className={styles.heroText}>
                  <span className={styles.label}>Available balance</span>
                  <p className={styles.balance}>
                    {currentCoin?.totalAmount}{' '}
                    <span className={styles.balanceSymbol}>{symbol}</span>
                  </p>
                </div>
              </div>
              {stakingInfo.length > 0 && (
                <div className={styles.rows}>
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
              )}
              <div className={styles.actions}>
                <GeneralButton
                  fullWidth
                  onClick={() => {
                    router.push(routes.coin.createStaking());
                  }}>
                  <PlusIcon size={18} />
                  Stake
                </GeneralButton>
                {isShowVote && (
                  <GeneralButton
                    variant='secondary'
                    fullWidth
                    onClick={() => {
                      dispatch(setSelectedVotes(null));
                      router.push(routes.coin.voteStaking());
                    }}>
                    Validators
                  </GeneralButton>
                )}
                {isShowUnstaking && !isEvmChain && (
                  <GeneralButton
                    variant='secondary'
                    fullWidth
                    disabled={!!unstakingDisableText}
                    onClick={() => {
                      const payload = {
                        withdrawStaking: {
                          isDeactivateStaking: true,
                        },
                      };
                      dispatch(setRouteStateData(payload));
                      router.push(routes.coin.withdrawStaking());
                    }}>
                    Unstake
                  </GeneralButton>
                )}
              </div>
              {!!unstakingDisableText && (
                <p className={styles.notice}>{unstakingDisableText}</p>
              )}
            </section>

            <section className={styles.listCard} aria-label='Active staking'>
              <div className={styles.listHeader}>
                <h2 className={styles.listTitle}>Active staking</h2>
                <span className={styles.count}>{staking.length}</span>
              </div>
              {staking.length ? (
                <div className={styles.list}>
                  {staking.map((item, index) => (
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
              ) : (
                <p className={styles.empty}>
                  Nothing staked yet. Stake {symbol} to start earning rewards.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default StakingList;
