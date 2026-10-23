import React, {useState} from 'react';
import HomeSheet from './HomeSheet';
import AssetRow from './AssetRow';
import {SearchIcon} from './HomeIcons';
import s from './Home.module.css';

const filterCoins = (coins, query) => {
  const q = query.trim().toLowerCase();
  return q
    ? coins.filter(
        item =>
          item?.name?.toLowerCase().includes(q) ||
          item?.symbol?.toLowerCase().includes(q),
      )
    : coins;
};

// Coin choice behind the Send / Receive quick actions.
const CoinPicker = ({
  visible,
  onClose,
  title,
  coins,
  hidden,
  localCurrency,
  onPick,
}) => {
  const [query, setQuery] = useState('');
  const list = filterCoins(coins, query);
  return (
    <HomeSheet
      visible={visible}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      title={title}
      labelId='coin-picker-title'>
      <label className={s.sheetSearch}>
        <SearchIcon size={17} />
        <input
          autoFocus={true}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Search coins'
          aria-label='Search coins'
        />
      </label>
      <div className={s.pickerList}>
        {list.map(item => (
          <AssetRow
            key={item._id}
            item={item}
            hidden={hidden}
            localCurrency={localCurrency}
            onPick={coin => {
              setQuery('');
              onPick(coin);
            }}
          />
        ))}
        {list.length === 0 ? (
          <p className={s.sheetEmpty}>No coins found</p>
        ) : null}
      </div>
    </HomeSheet>
  );
};

export default CoinPicker;
