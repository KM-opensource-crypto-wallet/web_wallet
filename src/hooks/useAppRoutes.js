import {useMemo} from 'react';
import {useParams} from 'next/navigation';
import {useSelector} from 'react-redux';
import {
  selectCurrentCoin,
  selectCurrentWalletClientId,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getCoinSlug} from 'utils/common';
import {coinRoutes, walletRoutes} from 'utils/routes';

const bind = (routes, ...boundArgs) =>
  Object.fromEntries(
    Object.entries(routes).map(([name, build]) => [
      name,
      (...rest) => build(...boundArgs, ...rest),
    ]),
  );

// Route builders pre-bound to the active wallet and coin. Inside
// /wallet/[clientId]/... the ids come from the URL; elsewhere (Header, Home
// coin list, sidebar) they fall back to redux. `coin.*` builders return null
// when no coin is known, so callers can guard on them.
export const useAppRoutes = () => {
  const params = useParams();
  const currentWalletClientId = useSelector(selectCurrentWalletClientId);
  const currentCoin = useSelector(selectCurrentCoin);

  const clientId = params?.clientId ?? currentWalletClientId;
  const coinSlug = params?.coinSlug ?? getCoinSlug(currentCoin);

  return useMemo(() => {
    const wallet = bind(walletRoutes, clientId);
    const coin = coinSlug
      ? bind(coinRoutes, clientId, coinSlug)
      : Object.fromEntries(
          Object.keys(coinRoutes).map(name => [name, () => null]),
        );
    return {clientId, coinSlug, wallet, coin};
  }, [clientId, coinSlug]);
};

export default useAppRoutes;
