'use client';
import {coinRoutes} from 'utils/routes';
import React, {memo, useCallback} from 'react';
import {useSelector} from 'react-redux';
import {
  isBitcoinChain,
  validateSupportedChain,
} from 'dok-wallet-blockchain-networks/helper';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getCoinSlug, isValidBrowser} from 'utils/common';
import {
  addOrToggleCoinInWallet,
  setCurrentCoin,
  setCurrentWalletCoinsPosition,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import CoinIcon from 'components/CoinIcon';
import PriceChange from 'components/PriceChange';
import {ChevronDownIcon} from 'components/Home/HomeIcons';
import s from './DraggableCryptoList.module.css';

const GripIcon = () => (
  <svg width='16' height='16' viewBox='0 0 24 24' aria-hidden='true'>
    {[6, 12, 18].map(y =>
      [9, 15].map(x => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r='1.6'
          style={{fill: 'currentColor'}}
        />
      )),
    )}
  </svg>
);

// One coin on Manage coins: icon, symbol + network, name · balance, and the
// "show on Home" switch. In reorder mode the switch gives way to a drag
// handle and up / down buttons.
const ManageCoinRow = ({
  item,
  index,
  coinsLength,
  dispatch,
  router,
  setRenderList,
  isSortSelected,
  dragHandleProps,
}) => {
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const isOn = !!item?.isInWallet;
  const showNetwork =
    item?.type === 'token' || isBitcoinChain(item?.chain_name);
  const balance = item?.totalBalance ?? item?.totalAmount;

  const onOpen = useCallback(() => {
    dispatch(setCurrentCoin(item?._id));
    router.push(
      currentWalletClientId
        ? coinRoutes.send(currentWalletClientId, getCoinSlug(item))
        : '/home/send',
    );
  }, [dispatch, item, currentWalletClientId, router]);

  const onToggle = useCallback(() => {
    dispatch(addOrToggleCoinInWallet(item));
    setRenderList(prev =>
      prev.map(subItem =>
        subItem._id === item._id
          ? {...subItem, isInWallet: !subItem.isInWallet}
          : subItem,
      ),
    );
  }, [dispatch, item, setRenderList]);

  if (!validateSupportedChain(item?.chain_name)) {
    return null;
  }
  if (item?.chain_name === 'thorchain' && !isValidBrowser()) {
    return null;
  }

  return (
    <div className={`${s.row} ${isOn || isSortSelected ? '' : s.rowOff}`}>
      {isSortSelected && dragHandleProps ? (
        <span
          {...dragHandleProps}
          className={s.grip}
          aria-label={`Drag ${item?.symbol}`}>
          <GripIcon />
        </span>
      ) : null}
      <button type='button' className={s.main} onClick={onOpen}>
        <span className={s.icon}>
          <CoinIcon item={item} />
        </span>
        <span className={s.text}>
          <span className={s.titleRow}>
            <span className={s.symbol}>{item?.symbol}</span>
            {showNetwork && item?.chain_display_name ? (
              <span className={s.chip}>{item.chain_display_name}</span>
            ) : null}
            <PriceChange value={item?.priceChange24h} className={s.change} />
          </span>
          <span className={s.sub}>
            {item?.name}
            {balance != null && balance !== '' ? ` · ${balance}` : ''}
          </span>
        </span>
      </button>

      {isSortSelected ? (
        coinsLength > 1 ? (
          <span className={s.moves}>
            <button
              type='button'
              className={s.move}
              aria-label='Move up'
              disabled={index === 0}
              onClick={() =>
                dispatch(setCurrentWalletCoinsPosition({index, isMoveUp: true}))
              }>
              <ChevronDownIcon size={16} className={s.up} />
            </button>
            <button
              type='button'
              className={s.move}
              aria-label='Move down'
              disabled={index === coinsLength - 1}
              onClick={() =>
                dispatch(
                  setCurrentWalletCoinsPosition({index, isMoveUp: false}),
                )
              }>
              <ChevronDownIcon size={16} />
            </button>
          </span>
        ) : null
      ) : (
        <button
          type='button'
          role='switch'
          aria-checked={isOn}
          aria-label={`Show ${item?.symbol} on Home`}
          className={`${s.switch} ${isOn ? s.switchOn : ''}`}
          onClick={onToggle}>
          <span className={s.knob} />
        </button>
      )}
    </div>
  );
};

export default memo(
  ManageCoinRow,
  (prev, next) =>
    prev.index === next.index &&
    prev.coinsLength === next.coinsLength &&
    prev.isSortSelected === next.isSortSelected &&
    JSON.stringify(prev.item) === JSON.stringify(next.item),
);
