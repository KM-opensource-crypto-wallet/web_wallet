import React, {memo} from 'react';
import {isBitcoinChain} from 'dok-wallet-blockchain-networks/helper';
import {currencySymbol} from 'src/data/lists/currency';
import CoinIcon from 'components/CoinIcon';
import GeneralButton from 'components/Button';
import PriceChange from 'components/PriceChange';
import {ChevronRightIcon} from './HomeIcons';
import s from './Home.module.css';

export const MASK = '••••••';

// One coin of the current wallet: icon, symbol (+ network for tokens and
// bitcoin address types), name, balance and its value. On wide screens it
// also shows the coin's share of the wallet.
const AssetRow = ({item, hidden, localCurrency, share = 0, onPick}) => {
  const showNetwork =
    item?.type === 'token' || isBitcoinChain(item?.chain_name);
  return (
    <GeneralButton
      variant='unstyled'
      className={s.asset}
      onClick={() => onPick(item)}>
      <span className={s.assetIcon}>
        <CoinIcon item={item} />
      </span>
      <span className={s.assetMain}>
        <span className={s.assetTitle}>
          <span className={s.assetSymbol}>{item?.symbol}</span>
          {showNetwork && item?.chain_display_name ? (
            <span className={s.assetNetwork}>{item.chain_display_name}</span>
          ) : null}
        </span>
        <span className={s.assetSub}>
          <span className={s.assetName}>{item?.name}</span>
          <PriceChange value={item?.priceChange24h} className={s.assetChange} />
        </span>
      </span>
      <span className={s.assetShare} title='Share of wallet'>
        <span className={s.assetShareTrack} aria-hidden='true'>
          <span
            className={s.assetShareFill}
            style={{width: `${Math.min(share, 100)}%`}}
          />
        </span>
        <span className={s.assetShareText}>
          {share >= 0.1 || share === 0 ? share.toFixed(1) : '<0.1'}%
        </span>
      </span>
      <span className={s.assetAmounts}>
        <span className={s.assetBalance}>
          {hidden ? MASK : item?.totalBalance}
        </span>
        <span className={s.assetValue}>
          {hidden
            ? '••••'
            : `${currencySymbol[localCurrency] || ''}${
                item?.totalBalanceCourse ?? '0'
              }`}
        </span>
      </span>
      <ChevronRightIcon size={17} className={s.assetChevron} />
    </GeneralButton>
  );
};

export default memo(AssetRow);
