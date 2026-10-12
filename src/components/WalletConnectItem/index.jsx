import styles from './WalletConnectItem.module.css';
import React from 'react';
import Image from 'next/image';
import WalletConnectChainRow from 'components/WalletConnectChainRow';
import useWalletConnectSessions from 'src/hooks/walletConnect/useWalletConnectSessions';

/////////////////////////////////////////

const WalletConnectItem = ({onClose}) => {
  const {
    sessions: allSessions,
    disconnect: onPressDisconnect,
    isDisconnecting,
  } = useWalletConnectSessions({onLastDisconnected: onClose});

  return allSessions.map((item, index) => {
    const metadata = item?.peer?.metadata;
    const icon = metadata?.icons[0] || '';
    const chainData = Array.isArray(item?.chainData) ? item?.chainData : [];
    const isDeleting = isDisconnecting(item.pairingTopic);
    return (
      <div className={styles.itemView} key={'' + item.key + index}>
        <div className={styles.rowView}>
          <Image
            src={icon}
            className={styles.rowImageStyle}
            alt={'icon'}
            width={60}
            height={60}
            priority
          />

          <div className={styles.centerItemView}>
            <p className={styles.title}>{`${metadata?.name}`}</p>
            <p className={styles.url}>{metadata?.url}</p>
          </div>
        </div>
        <p className={styles.title}>{'Chains'}</p>
        {chainData?.map((chain, i) => (
          <div className={styles.chainRowView} key={'' + chain?._id + i}>
            <WalletConnectChainRow
              icon={chain?.icon}
              chain_name={chain?.chain_name}
              title={chain?.chain_display_name}
              subtitle={chain?.address}
            />
          </div>
        ))}
        <button
          disabled={isDeleting}
          className={styles.buttonStyle}
          style={{
            backgroundColor: isDeleting ? '#708090' : 'red',
          }}
          onClick={() => {
            onPressDisconnect(item.pairingTopic, item.topic).then();
          }}>
          {'Disconnect App'}
        </button>
        <div className={styles.borderView} />
      </div>
    );
  });
};

export default WalletConnectItem;
