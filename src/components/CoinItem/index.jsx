'use client';
import {coinRoutes} from 'utils/routes';
import React, {memo, useCallback} from 'react';
import {useSelector} from 'react-redux';
import {
  checkValidChainForWalletImportWithPrivateKey,
  isBitcoinChain,
  validateSupportedChain,
} from 'dok-wallet-blockchain-networks/helper';
import {selectCurrentWalletClientId} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getCoinSlug, isValidBrowser} from 'utils/common';
import {
  addOrToggleCoinInWallet,
  setCurrentCoin,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import CoinIcon from 'components/CoinIcon';
import s from 'components/ModalAddCoins/ModalAddCoins.module.css';

// One row of the "Add coin or token" catalog: icon, symbol + network, name,
// and the in-wallet switch. Coins a private-key wallet can't hold (other
// chains) are shown disabled.
const CoinItem = ({
  currentWallet,
  item,
  number,
  router,
  showSwitch,
  dispatch,
  setRenderList,
}) => {
  const isAddCoin = number === 3;
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const isDisabledItem =
    isAddCoin &&
    !checkValidChainForWalletImportWithPrivateKey({
      currentWallet,
      currentCoin: item,
    });
  const showNetwork =
    item?.type === 'token' || isBitcoinChain(item?.chain_name);

  const onPressItem = useCallback(() => {
    // A catalog coin that isn't in the wallet has no wallet entry to select;
    // setCurrentCoin would throw "Coin id does not exist".
    if (isAddCoin && !item?.isInWallet) {
      return;
    }
    dispatch(setCurrentCoin(item?._id));
    // Without an active wallet id the legacy forwarder resolves /home/send.
    router.push(
      currentWalletClientId
        ? coinRoutes.send(currentWalletClientId, getCoinSlug(item))
        : '/home/send',
    );
  }, [dispatch, item, isAddCoin, currentWalletClientId, router]);

  const onChangeValue = useCallback(() => {
    dispatch(addOrToggleCoinInWallet(item));
    setRenderList(prevState =>
      prevState.map(subItem =>
        item._id === subItem._id
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

  const isOn = !!item?.isInWallet;

  return (
    <div
      className={`${s.coinRow} ${isDisabledItem ? s.coinRowDisabled : ''}`}
      title={isDisabledItem ? 'Not available for this wallet' : undefined}>
      <span className={s.coinIcon}>
        <CoinIcon item={item} />
      </span>
      <span
        className={s.coinText}
        role={isOn && !isDisabledItem ? 'button' : undefined}
        tabIndex={isOn && !isDisabledItem ? 0 : undefined}
        onClick={isDisabledItem ? undefined : onPressItem}
        onKeyDown={event => {
          if (isOn && !isDisabledItem && event.key === 'Enter') {
            onPressItem();
          }
        }}>
        <span className={s.coinTitleRow}>
          <span className={s.coinSymbol}>{item?.symbol}</span>
          {showNetwork && item?.chain_display_name ? (
            <span className={s.chip}>{item.chain_display_name}</span>
          ) : null}
        </span>
        <span className={s.coinName}>{item?.name}</span>
      </span>
      {showSwitch ? (
        <button
          type='button'
          role='switch'
          aria-checked={isOn}
          aria-label={`${isOn ? 'Remove' : 'Add'} ${item?.symbol}`}
          className={`${s.switch} ${isOn ? s.switchOn : ''}`}
          disabled={isDisabledItem}
          onClick={onChangeValue}>
          <span className={s.knob} />
        </button>
      ) : null}
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
      JSON.stringify(nextProps.currentWallet)
  );
});
