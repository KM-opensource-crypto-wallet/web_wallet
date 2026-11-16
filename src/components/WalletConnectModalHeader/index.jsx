'use client';

import React from 'react';
import Image from 'next/image';
import s from './WalletConnectModalHeader.module.css';
import WalletConnectVerifyBadge from 'components/WalletConnectVerifyBadge';

const WalletConnect = require('assets/images/WalletConnect.png').default;

// Top of both WalletConnect modals: the WalletConnect banner, then the dApp's
// icon, name and url, then the WalletConnect Verify badge for `verifyContext`.
// `image` is the dApp's remote icon (may be null).
const WalletConnectModalHeader = ({
  image,
  title,
  url,
  verifyContext,
  acknowledged,
  onToggleAcknowledged,
}) => (
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
    <WalletConnectVerifyBadge
      verifyContext={verifyContext}
      appUrl={url}
      acknowledged={acknowledged}
      onToggleAcknowledged={onToggleAcknowledged}
    />
    <div className={s.borderView} />
  </>
);

export default WalletConnectModalHeader;
