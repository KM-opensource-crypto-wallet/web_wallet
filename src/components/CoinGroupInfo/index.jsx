import React, {useCallback} from 'react';
import Modal from '@mui/material/Modal';
import Image from 'next/image';
import styles from './CoinGroupInfo.module.css';
import {useGroupCoins} from 'src/hooks/useGroupCoins';
import CoinIcons from 'src/components/CoinsIcons';
import GeneralButton from 'components/Button';
import {CheckIcon, CloseIcon, PlusIcon} from 'components/Home/HomeIcons';

// A coin group's description and coins, with Add for the whole group. Bottom
// sheet on phones, centred dialog from 600px up.
const CoinGroupInfoModal = ({
  visible,
  onDismiss,
  groups,
  selectedGroupId,
  isAddingGroup,
  onPressAddItem,
  currentWallet,
  userCoins,
}) => {
  const selectedGroup = groups.find(group => group._id === selectedGroupId);

  const {isDisabledItem, isGroupCoinsAdded, isAdding} = useGroupCoins({
    currentWallet,
    group: selectedGroup,
    isAddingGroup,
    userCoins,
  });

  const onLocalAddPress = useCallback(
    e => {
      e.stopPropagation();
      if (onPressAddItem) {
        onPressAddItem(selectedGroup, isGroupCoinsAdded);
      }
    },
    [isGroupCoinsAdded, selectedGroup, onPressAddItem],
  );

  if (!selectedGroup) return null;

  const icons = selectedGroup?.coins?.map(coin => coin.icon);

  return (
    <Modal
      open={visible}
      onClose={onDismiss}
      aria-labelledby='coin-group-info-title'
      aria-describedby='coin-group-info-description'
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <h2 id='coin-group-info-title' className={styles.title}>
            {selectedGroup.name}
          </h2>
          <div className={styles.headerActions}>
            <CoinIcons icons={icons} />
            <GeneralButton
              variant='unstyled'
              className={styles.btnClose}
              aria-label='Close'
              onClick={onDismiss}>
              <CloseIcon size={15} />
            </GeneralButton>
          </div>
        </div>
        <div className={styles.scroll}>
          <p id='coin-group-info-description' className={styles.description}>
            {selectedGroup.description}
          </p>
          <h3 className={styles.subTitle}>Coins</h3>
          <div className={styles.coinList}>
            {selectedGroup.coins.map((coin, index) => (
              <div key={coin._id || index} className={styles.coinItem}>
                <div className={styles.coinIconWrapper}>
                  <Image
                    src={coin.icon}
                    alt={coin.name}
                    width={30}
                    height={30}
                    className={styles.coinIcon}
                  />
                </div>
                <div className={styles.coinInfo}>
                  <div className={styles.coinTitleGroup}>
                    <span className={styles.coinSymbol}>{coin.symbol}</span>
                    <span className={styles.chainName}>
                      {coin.chain_display_name}
                    </span>
                  </div>
                  <span className={styles.coinName}>{coin.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <GeneralButton
          fullWidth
          onClick={onLocalAddPress}
          disabled={isGroupCoinsAdded || isDisabledItem || isAdding}
          className={styles.addButton}
          data-state={
            isAdding ? 'adding' : isGroupCoinsAdded ? 'added' : 'default'
          }>
          {isGroupCoinsAdded ? <CheckIcon size={18} /> : <PlusIcon size={18} />}
          {isAdding ? 'Adding...' : isGroupCoinsAdded ? 'Added' : 'Add'}
        </GeneralButton>
      </div>
    </Modal>
  );
};

export default CoinGroupInfoModal;
