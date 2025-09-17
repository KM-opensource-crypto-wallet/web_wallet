'use client';
import React, {memo, useCallback} from 'react';
import {
  checkValidChainForWalletImportWithPrivateKey,
  isBitcoinChain,
  validateSupportedChain,
} from 'dok-wallet-blockchain-networks/helper';
import {isValidBrowser} from 'utils/common';
import Image from 'next/image';
import {
  addOrToggleCoinInWallet,
  setCurrentCoin,
  setCurrentWalletCoinsPosition,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {currencySymbol} from 'data/currency';
import Switch from '@mui/material/Switch';
import styles from './CoinItem.module.css';
import CoinIcon from 'components/CoinIcon';
const icons = require(`assets/images/icons`).default;

const disabledStyle = {
  filter: 'opacity(0.5) drop-shadow(0 0 0 gray)',
  cursor: 'not-allowed',
};

const CoinItem = ({
  currentWallet,
  item,
  index,
  number,
  router,
  showSwitch,
  dispatch,
  setRenderList,
  localCurrency,
  dragHandleProps,
  isSortSelected,
  coinsLength,
  PngIcons,
}) => {
  const isCoinInWallet = item?.isInWallet;
  const isToken = item?.type === 'token';
  const isAddCoin = number === 3;

  const isDisabledItem =
    isAddCoin &&
    !checkValidChainForWalletImportWithPrivateKey({
      currentWallet,
      currentCoin: item,
    });

  const isBitcoin = isBitcoinChain(item?.chain_name);

  const onPressMove = isMoveUp => {
    dispatch(setCurrentWalletCoinsPosition({index, isMoveUp}));
  };

  const onPressItem = useCallback(() => {
    dispatch(setCurrentCoin(item?._id));
    router.push(`/home/send`);
  }, [dispatch, item?._id, router]);

  const onChangeValue = useCallback(() => {
    dispatch(addOrToggleCoinInWallet(item));
    setRenderList(prevState =>
      prevState.map(subItem => {
        if (item._id === subItem._id) {
          return {...subItem, isInWallet: !subItem.isInWallet};
        }
        return subItem;
      }),
    );
  }, [dispatch, item, setRenderList]);

  if (!validateSupportedChain(item?.chain_name)) {
    return null;
  }
  if (item?.chain_name === 'thorchain' && !isValidBrowser()) {
    return null;
  }

  return (
    <div
      key={index}
      className={styles.section}
      style={isDisabledItem ? {backgroundColor: 'var(--disabledItem)'} : {}}>
      {isSortSelected && dragHandleProps && (
        <span
          {...dragHandleProps}
          style={{
            cursor: 'grab',
            marginRight: 10,
            height: 30,
            width: 30,
            fill: 'var(--font)',
          }}>
          {icons.dragVertical}
        </span>
      )}
      <CoinIcon item={item} />

      <div className={styles.list}>
        <button
          className={styles.box}
          disabled={isDisabledItem}
          onClick={onPressItem}>
          <div className={styles.item}>
            <div className={styles.rowStyle}>
              <p className={styles.title} title={item?.symbol}>
                {item?.symbol}
              </p>
              {/* {isToken && ( */}
              {(isToken || isBitcoin) && (
                <p className={styles.chainDisplayName}>
                  {item?.chain_display_name}
                </p>
              )}
              {/* )} */}
            </div>
            <p className={styles.text} title={item?.name}>
              {item?.name}
            </p>
          </div>

          {number === 1 && (
            <div className={styles.itemNumber}>
              <p className={styles.title}>{item?.totalBalance}</p>
              <p className={styles.text}>
                {currencySymbol[localCurrency] || ''} {item?.totalBalanceCourse}
              </p>
            </div>
          )}
        </button>

        {number === 1 && (
          <div className={styles.arrow}>{icons.keyboard_arrow_right}</div>
        )}
        {isSortSelected && coinsLength > 1 && PngIcons && (
          <>
            <button
              disabled={index === 0}
              className={styles.boxBtn}
              onClick={() => {
                onPressMove(true);
              }}>
              <Image
                style={index === 0 && disabledStyle}
                src={PngIcons.UpArrow}
                alt={'Up arrow'}
                width={24}
                height={24}
              />
            </button>
            <button
              disabled={index === coinsLength - 1}
              className={styles.boxBtn}
              onClick={() => {
                onPressMove(false);
              }}>
              <Image
                src={PngIcons.DownArrow}
                alt={'Down arrow'}
                width={24}
                height={24}
                style={index === coinsLength - 1 && disabledStyle}
              />
            </button>
          </>
        )}
        {showSwitch && !isSortSelected && (
          <Switch
            checked={isCoinInWallet}
            onChange={onChangeValue}
            disabled={isDisabledItem}
            color='warning'
          />
        )}
      </div>
    </div>
  );
};

export default memo(CoinItem, (prevProps, nextProps) => {
  const key1 = `${prevProps?.item?.chain_name}_${prevProps?.item?.symbol}_${prevProps?.index}`;
  const key2 = `${nextProps?.item?.chain_name}_${nextProps?.item?.symbol}_${nextProps?.index}`;
  return (
    key1 === key2 &&
    JSON.stringify(prevProps.item) === JSON.stringify(nextProps.item) &&
    JSON.stringify(prevProps.currentWallet) ===
      JSON.stringify(nextProps.currentWallet) &&
    prevProps.isSortSelected === nextProps.isSortSelected
  );
});
