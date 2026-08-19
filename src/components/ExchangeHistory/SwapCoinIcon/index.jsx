'use client';
import React from 'react';
import ChainIcon from 'components/ChainIcon';
import s from './SwapCoinIcon.module.css';

// Round coin icon with a chain badge, for swap history where only
// symbol + chain_name are known. Falls back to a symbol monogram when the
// coin's icon URL can't be resolved. itemType="token" forces ChainIcon to
// render the badge even for native coins — in a swap row the chain is the
// information, not a redundancy.
const SwapCoinIcon = ({icon, symbol, chainName, size = 28}) => {
  const round = {width: size, height: size};

  return (
    <div className={s.wrap} style={round}>
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt='' className={s.icon} style={round} />
      ) : (
        <div className={s.monogram} style={round}>
          <span
            className={s.monogramText}
            style={{fontSize: Math.max(size * 0.26, 9)}}>
            {symbol?.slice(0, 4) || '—'}
          </span>
        </div>
      )}
      <ChainIcon
        chainName={chainName}
        itemType={'token'}
        size={Math.round(size / 2)}
      />
    </div>
  );
};

export default React.memo(SwapCoinIcon);
