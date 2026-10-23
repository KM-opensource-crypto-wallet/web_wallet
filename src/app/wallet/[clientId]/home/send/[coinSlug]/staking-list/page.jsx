'use client';
import React from 'react';
import useStaking from 'src/hooks/protectedRoutes/wallet/home/send/useStaking';
import Loading from 'components/Loading';
import styles from './StakingList.module.css';
import StakingItem from 'components/StakingItem';
import CoinIcon from 'components/CoinIcon';
import PriceChange from 'components/PriceChange';
import GeneralButton from 'components/Button';
import {PlusIcon} from 'components/Home/HomeIcons';
import Screen from 'components/Screen';

const StakingList = () => {
  const {
    isLoading,
    currentCoin,
    symbol,
    stakingInfo,
    onPressBoxItem,
    goToCreateStaking,
    isShowVote,
    goToValidators,
    isShowUnstaking,
    isEvmChain,
    unstakingDisableText,
    onUnstake,
    staking,
    estimateEpochTimestamp,
    handleClaimReward,
  } = useStaking('list');

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

  return (
    <Screen className={styles.page} title='Staking'>
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
                  <span className={styles.label}>
                    Available balance
                    <PriceChange
                      value={currentCoin?.priceChange24h}
                      className={styles.labelChange}
                    />
                  </span>
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
                <GeneralButton fullWidth onClick={goToCreateStaking}>
                  <PlusIcon size={18} />
                  Stake
                </GeneralButton>
                {isShowVote && (
                  <GeneralButton
                    variant='secondary'
                    fullWidth
                    onClick={goToValidators}>
                    Validators
                  </GeneralButton>
                )}
                {isShowUnstaking && !isEvmChain && (
                  <GeneralButton
                    variant='secondary'
                    fullWidth
                    disabled={!!unstakingDisableText}
                    onClick={onUnstake}>
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
    </Screen>
  );
};

export default StakingList;
