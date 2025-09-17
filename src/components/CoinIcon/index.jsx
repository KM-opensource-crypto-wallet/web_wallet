'use client';
import React from 'react';
import Image from 'next/image';
import ChainIcon from 'components/ChainIcon';
import styles from './CoinIcon.module.css';

const CoinIcon = ({item}) => {
  return (
    <div className={styles.iconBox}>
      {item?.icon && (
        <Image
          src={item.icon}
          alt={`${item.name || 'Token'} icon`}
          fill
          className={styles.imageStyle}
          style={{objectFit: 'contain'}}
          priority={false}
        />
      )}
      <ChainIcon chainName={item?.chain_name} itemType={item?.type} size={20} />
    </div>
  );
};

export default React.memo(CoinIcon, (prevProps, nextProps) => {
  return (
    prevProps.item?.icon === nextProps.item?.icon &&
    prevProps.item?.chain_name === nextProps.item?.chain_name &&
    prevProps.item?.type === nextProps.item?.type
  );
});
