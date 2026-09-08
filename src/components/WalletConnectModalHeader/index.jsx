'use client';

import React from 'react';
import Image from 'next/image';
import s from './WalletConnectModalHeader.module.css';

const WalletConnect = require('assets/images/WalletConnect.png').default;

// Top of both WalletConnect modals: the WalletConnect banner, then the dApp's
// icon, name and url. `image` is the dApp's remote icon (may be null).
const WalletConnectModalHeader = ({image, title, url}) => (
  <>
    <Image src={WalletConnect} alt='connect' className={s.mainImageStyle} />
    <div className={s.borderView} />
    <div className={s.mainView}>
      {image && (
        <Image
          src={image}
          className={s.imageStyle}
          alt={'image'}
          width={60}
          height={60}
          priority
        />
      )}
      <div className={s.box}>
        <p className={s.title}>{title}</p>
        <p className={s.url}>{url}</p>
      </div>
    </div>
    <div className={s.borderView} />
  </>
);

export default WalletConnectModalHeader;
