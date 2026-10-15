'use client';

import React from 'react';
import Image from 'next/image';
import s from './WalletConnectSheet.module.css';

const WalletConnectLogo = require('assets/images/WalletConnect.png').default;

// Top of both WalletConnect modals: the dApp's icon (WalletConnect badge in
// the corner), name and full url. `image` is the dApp's remote icon (may be
// null; the WalletConnect logo stands in).
const DappHero = ({image, title, url, titleId}) => (
  <div className={s.hero}>
    <span className={s.heroLogo}>
      <span className={s.heroImage}>
        <Image
          src={image || WalletConnectLogo}
          alt=''
          width={60}
          height={60}
          priority
        />
      </span>
      {image ? (
        <span className={s.heroBadge}>
          <Image src={WalletConnectLogo} alt='' width={24} height={24} />
        </span>
      ) : null}
    </span>
    <h2 id={titleId} className={s.heroTitle}>
      {title}
    </h2>
    {url ? <p className={s.heroUrl}>{url}</p> : null}
  </div>
);

export default DappHero;
