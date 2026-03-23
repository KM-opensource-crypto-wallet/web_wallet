'use client';
import React from 'react';
import Image from 'next/image';
import styles from './ChainIcon.module.css';

// Import all chain logo images
import aptosLogo from 'assets/chain_logo/aptos.png';
import arbitrumLogo from 'assets/chain_logo/arbitrum.png';
import avalancheLogo from 'assets/chain_logo/avalanche.png';
import baseLogo from 'assets/chain_logo/base.png';
import binanceSmartChainLogo from 'assets/chain_logo/binance_smart_chain.png';
import cosmosLogo from 'assets/chain_logo/cosmos.png';
import ethereumLogo from 'assets/chain_logo/ethereum.png';
import ethereumClassicLogo from 'assets/chain_logo/ethereum_classic.png';
import ethereumPowLogo from 'assets/chain_logo/ethereum_pow.png';
import fantomLogo from 'assets/chain_logo/fantom.png';
import gnosisLogo from 'assets/chain_logo/gnosis.png';
import inkLogo from 'assets/chain_logo/ink.png';
import kavaLogo from 'assets/chain_logo/kava.png';
import lineaLogo from 'assets/chain_logo/linea.png';
import optimismLogo from 'assets/chain_logo/optimism.png';
import optimismBinanceSmartChainLogo from 'assets/chain_logo/optimism_binance_smart_chain.png';
import polygonLogo from 'assets/chain_logo/polygon.png';
import rippleLogo from 'assets/chain_logo/ripple.png';
import solanaLogo from 'assets/chain_logo/solana.png';
import stellarLogo from 'assets/chain_logo/stellar.png';
import tezosLogo from 'assets/chain_logo/tezos.png';
import tonLogo from 'assets/chain_logo/ton.png';
import tronLogo from 'assets/chain_logo/tron.png';
import victionLogo from 'assets/chain_logo/viction.png';
import zksyncLogo from 'assets/chain_logo/zksync.png';
import seiLogo from 'assets/chain_logo/sei.png';

const chainLogoMap = {
  aptos: aptosLogo,
  arbitrum: arbitrumLogo,
  avalanche: avalancheLogo,
  base: baseLogo,
  binance_smart_chain: binanceSmartChainLogo,
  cosmos: cosmosLogo,
  ethereum: ethereumLogo,
  ethereum_classic: ethereumClassicLogo,
  ethereum_pow: ethereumPowLogo,
  fantom: fantomLogo,
  gnosis: gnosisLogo,
  ink: inkLogo,
  kava: kavaLogo,
  linea: lineaLogo,
  optimism: optimismLogo,
  optimism_binance_smart_chain: optimismBinanceSmartChainLogo,
  polygon: polygonLogo,
  ripple: rippleLogo,
  solana: solanaLogo,
  stellar: stellarLogo,
  tezos: tezosLogo,
  ton: tonLogo,
  tron: tronLogo,
  viction: victionLogo,
  zksync: zksyncLogo,
  sei: seiLogo,
};

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
