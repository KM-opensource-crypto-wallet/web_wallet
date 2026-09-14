import React, {memo, useCallback} from 'react';
import icons from 'assets/images/icons';
import {validateNumber} from 'dok-wallet-blockchain-networks/helper';
import styles from './ValidatorItem.module.css';

const ValidatorItem = ({
  item,
  selectedVotes,
  onPressAdd,
  onPressMinus,
  onChangeText,
  hideInput,
  containerStyle,
}) => {
  const validatorAddress = item?.validatorAddress;

  const onLocalPressAdd = useCallback(() => {
    onPressAdd(validatorAddress);
  }, [validatorAddress, onPressAdd]);

  const onLocalPressMinus = useCallback(() => {
    onPressMinus(validatorAddress);
  }, [validatorAddress, onPressMinus]);

  const onLocalChangeText = useCallback(
    event => {
      onChangeText(validatorAddress, event?.target.value);
    },
    [validatorAddress, onChangeText],
  );

  const isHaveVote = validateNumber(selectedVotes?.[item?.validatorAddress]);
  return (
    <div
      className={styles.itemView}
      style={{
        borderColor: isHaveVote ? 'var(--background)' : 'var(headerBorder)',
        ...containerStyle,
      }}>
      <div className={styles.leftView}>
        <div className={styles.innerView}>
          <p className={styles.itemTitle}>{item?.name}</p>
        </div>
        <div className={styles.innerView}>
          <p className={styles.itemDescriptionTitle}>{'Voted:'}</p>
          <p className={styles.itemDescription}>{item.activated_stake}</p>
        </div>
        <div className={styles.innerView}>
          <p className={styles.itemDescriptionTitle}>{'APY:'}</p>
          <p className={styles.itemDescription}>{item.apy_estimate}</p>
        </div>
      </div>
      {hideInput ? (
        <p className={styles.voteTitle}>{`${item?.votes} TP` || ''}</p>
      ) : (
        <div className={styles.rightView}>
          <button className={styles.buttonStyle} onClick={onLocalPressMinus}>
            <span className={styles.iconStyle}>{icons.minus_icon}</span>
          </button>
          <div
            className={styles.textInputStyle}
            contentEditable={true}
            onChange={onLocalChangeText}>
            {selectedVotes?.[item?.validatorAddress]?.toString() || '0'}
          </div>

          <button className={styles.buttonStyle} onClick={onLocalPressAdd}>
            <span className={styles.iconStyle}>{icons.add_icon}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(ValidatorItem, (prevProps, nextProps) => {
  const previousItem = prevProps.item;
  const nextItem = nextProps.item;
  const previousSelectedVotes = prevProps.selectedVotes;
  const nextSelectedVotes = nextProps.selectedVotes;
  return (
    previousSelectedVotes?.[previousItem?.validatorAddress] ===
    nextSelectedVotes?.[nextItem?.validatorAddress]
  );
});
