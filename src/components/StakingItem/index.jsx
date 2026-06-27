'use client';
import React from 'react';
import {currencySymbol} from 'data/currency';
import Icons from '../../assets/images/icons';
import {useRouter} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {toast} from 'react-toastify';
import Image from 'next/image';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import styles from './StakingItem.module.css';

const StakingItem = ({
  item,
  isWithdraw,
  estimateEpochTimestamp,
  showReward,
  handleClaimReward,
  isEvmChain,
}) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const currentCoin = useSelector(selectCurrentCoin);
  const localCurrency = useSelector(getLocalCurrency);

  const rewardAmount = item?.reward?.amount
    ? parseFloat(item.reward.amount)
    : 0;
  const hasReward = rewardAmount > 0;
  const rewardSymbol = item?.reward?.symbol || null;
  const rewardLogo = item?.reward?.logo || null;

  return (
    <div
      style={{pointerEvents: !isWithdraw ? 'none' : 'auto'}}
      onClick={() => {
        if (item?.status?.toLowerCase() === 'deactivating') {
          toast.error(
            'Already deactivating: Please wait until epoch end then you can withdraw.',
          );
        } else if (item?.status) {
          const payload = {
            withdrawStaking: {
              selectedStake: item,
              ...(item?.status === 'inactive'
                ? {isWithdrawStaking: true}
                : {isDeactivateStaking: true}),
            },
          };
          dispatch(setRouteStateData(payload));
          router.push('/home/withdraw-staking');
        } else if (isEvmChain) {
          const payload = {
            withdrawStaking: {
              selectedStake: item,
              ...(item?.status === 'inactive'
                ? {isWithdrawStaking: true}
                : {isDeactivateStaking: true}),
            },
          };
          dispatch(setRouteStateData(payload));
          router.push('/home/withdraw-staking');
        }
      }}>
      <div
        className={styles.rowView}
        style={
          !isWithdraw
            ? {border: '0.5px solid var(--gray)', borderRadius: 4}
            : {}
        }>
        <div className={styles.subRowView} style={{marginRight: 0}}>
          <div className={styles.subRowView}>
            {item?.validatorInfo?.image && (
              <Image
                src={item?.validatorInfo?.image}
                className={styles.imageStyle}
                alt=''
                width={40}
                height={40}
              />
            )}
            <div className={styles.flex1}>
              <div className={styles.titleItem}>
                {item?.validatorInfo?.name}
              </div>
              <div
                className={styles.statusText}
                style={
                  item?.status?.includes('ing') ? {color: 'var(--gray)'} : {}
                }>
                {item?.status}
              </div>
            </div>
          </div>
          <div className={styles.rightRowView}>
            <div>
              <div className={styles.balanceStyle}>{`${
                item?.stakedAmount ?? item?.amount
              } ${currentCoin?.symbol}`}</div>
              <div
                className={
                  styles.fiatStyle
                }>{`${currencySymbol[localCurrency]}${item?.fiatAmount}`}</div>
            </div>
            {!!isWithdraw && (
              <span className={styles.arrow}>{Icons.arrRight}</span>
            )}
          </div>
        </div>
        {hasReward && showReward && (
          <div
            className={styles.rewardCard}
            onClick={e => e.stopPropagation()}
            style={{cursor: 'default'}}>
            <div className={styles.rewardAccentBar} />
            {rewardLogo ? (
              <Image
                src={rewardLogo}
                className={styles.rewardTokenLogo}
                alt=''
                width={28}
                height={28}
              />
            ) : (
              <div className={styles.rewardTokenPlaceholder}>
                <span className={styles.rewardTokenPlaceholderText}>
                  {rewardSymbol?.[0] ?? '?'}
                </span>
              </div>
            )}
            <div className={styles.rewardTextGroup}>
              <div className={styles.rewardTitle}>Rewards Earned</div>
              <div className={styles.rewardSymbolText}>{rewardSymbol}</div>
            </div>
            <div className={styles.rewardValueText}>{`+${rewardAmount.toFixed(
              6,
            )}`}</div>
            {!!isWithdraw && typeof handleClaimReward === 'function' && (
              <button
                className={styles.claimButton}
                onClick={e => {
                  e.stopPropagation();
                  handleClaimReward(rewardAmount, item);
                }}>
                Claim
              </button>
            )}
          </div>
        )}
        {(item?.status?.toLowerCase() === 'activating' ||
          item?.status?.toLowerCase() === 'deactivating') &&
          !!isWithdraw &&
          !!estimateEpochTimestamp && (
            <div className={styles.remaningTime}>
              {`Estimate remaining ${estimateEpochTimestamp}`}
            </div>
          )}
      </div>
    </div>
  );
};

export default StakingItem;
