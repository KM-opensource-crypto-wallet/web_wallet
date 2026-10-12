import React, {memo, useCallback, useMemo} from 'react';
import {useGroupCoins} from '../../hooks/useGroupCoins';
import CoinIcons from '../CoinsIcons';
import {CheckIcon, PlusIcon} from 'components/Home/HomeIcons';
import s from 'components/ModalAddCoins/ModalAddCoins.module.css';

// One coin group in "Add coin or token": name, coin icons, description and
// an Add button. Tapping the row opens the group's details.
const CryptoGroupItem = ({
  currentWallet,
  item,
  userCoins,
  onPressItem,
  onPressAddItem,
  isAddingGroup,
}) => {
  const icons = useMemo(() => {
    return item?.coins?.map(subItem => subItem?.icon);
  }, [item?.coins]);

  const {isDisabledItem, isGroupCoinsAdded, isAdding} = useGroupCoins({
    currentWallet,
    group: item,
    isAddingGroup,
    userCoins,
  });

  const onLocalPress = useCallback(() => {
    if (onPressItem) {
      onPressItem(item, isGroupCoinsAdded);
    }
  }, [isGroupCoinsAdded, item, onPressItem]);

  const onLocalAddPress = useCallback(
    e => {
      e.stopPropagation();
      if (onPressAddItem) {
        onPressAddItem(item, isGroupCoinsAdded);
      }
    },
    [isGroupCoinsAdded, item, onPressAddItem],
  );

  return (
    <div
      role='button'
      tabIndex={isDisabledItem ? -1 : 0}
      aria-disabled={isDisabledItem}
      className={`${s.groupRow} ${isDisabledItem ? s.groupRowDisabled : ''}`}
      onClick={isDisabledItem ? undefined : onLocalPress}
      onKeyDown={event => {
        if (!isDisabledItem && event.key === 'Enter') {
          onLocalPress();
        }
      }}>
      <div className={s.groupText}>
        <div className={s.groupHead}>
          <h3 className={s.groupName}>{item?.name}</h3>
          <CoinIcons icons={icons} />
        </div>
        {item?.description ? (
          <p className={s.groupDescription}>{item.description}</p>
        ) : null}
      </div>
      <button
        type='button'
        onClick={onLocalAddPress}
        disabled={isDisabledItem || isAdding}
        className={`${s.groupAdd} ${isGroupCoinsAdded ? s.groupAdded : ''}`}>
        {isGroupCoinsAdded ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
        {isAdding ? 'Adding…' : isGroupCoinsAdded ? 'Added' : 'Add'}
      </button>
    </div>
  );
};

export default memo(CryptoGroupItem);
