'use client';
import React from 'react';
import Image from 'next/image';
import styles from './ChainIcon.module.css';

import {chainLogoMap} from 'assets/chain_logo';

const ChainIcon = ({chainName, itemType, size = 20}) => {
  if (itemType !== 'token' || !chainName) {
    return null;
  }

  const chainLogo = chainLogoMap[chainName.toLowerCase()];

  if (!chainLogo) {
    return null;
  }
  return (
    <div
      className={styles.chainIconContainer}
      style={{width: size, height: size}}>
      <Image
        src={chainLogo}
        alt={`${chainName} chain logo`}
        width={size}
        height={size}
        className={styles.chainIcon}
      />
    </div>
  );
};

export default ChainIcon;
