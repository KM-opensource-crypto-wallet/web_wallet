'use client';

import React from 'react';
import Image from 'next/image';
import {chainLogoMap} from 'assets/chain_logo';
import s from './WalletConnectChainRow.module.css';

// One chain of a WalletConnect session: bundled chain logo when we have one
// (falls back to the coin's remote icon), display name and account line.
// Shared by the session-proposal modal and the connected-apps list so the two
// never drift.
const WalletConnectChainRow = ({icon, chain_name, title, subtitle}) => {
  const source = chainLogoMap[chain_name?.toLowerCase()] || icon || null;
  return (
    <div className={s.row}>
      <div className={s.iconBox}>
        {source && <Image src={source} height={39} width={39} alt={'icon'} />}
      </div>
      <div className={s.centerItemView}>
        <p className={s.itemTitle}>{title}</p>
        <p className={s.subtitle} title={subtitle}>
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default WalletConnectChainRow;
