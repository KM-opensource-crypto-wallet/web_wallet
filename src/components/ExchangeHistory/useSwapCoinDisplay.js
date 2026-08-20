'use client';
import {useMemo} from 'react';
import {useSelector, shallowEqual} from 'react-redux';
import {selectCoinsForCurrentWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {selectAllCurrencies} from 'dok-wallet-blockchain-networks/redux/currency/currencySelectors';
import {
  getExchangeChainNames,
  getChainDisplayName,
} from 'components/ExchangeHistory/exchangeFormat';

// A swapped-away coin may no longer be in the wallet, so the wallet coins
// are tried first and the global currency catalogue second. The exact
// symbol + chain_name match wins; a symbol-only match is an acceptable
// fallback because a coin's logo is the same image on every chain.
const findCoinIcon = (lists, symbol, chainName) => {
  for (const list of lists) {
    if (!Array.isArray(list)) {
      continue;
    }
    const exact = chainName
      ? list.find(
          item =>
            item?.symbol?.toUpperCase() === symbol &&
            item?.chain_name === chainName &&
            item?.icon,
        )
      : null;
    if (exact) {
      return exact.icon;
    }
  }
  for (const list of lists) {
    if (!Array.isArray(list)) {
      continue;
    }
    const loose = list.find(
      item => item?.symbol?.toUpperCase() === symbol && item?.icon,
    );
    if (loose) {
      return loose.icon;
    }
  }
  return '';
};

// Resolves both sides of a swap transaction to displayable coin + chain
// identity: {symbol, icon, chainName, chainDisplayName}. Shared by the
// history row and the details screen.
const useSwapCoinDisplay = transaction => {
  const walletCoins = useSelector(selectCoinsForCurrentWallet, shallowEqual);
  const currencies = useSelector(selectAllCurrencies, shallowEqual);

  return useMemo(() => {
    const {fromChainName, toChainName} = getExchangeChainNames(transaction);
    const lists = [walletCoins, currencies];
    const buildSide = (currency, chainName) => {
      const symbol = currency?.toUpperCase() || '';
      return {
        symbol,
        icon: symbol ? findCoinIcon(lists, symbol, chainName) : '',
        chainName,
        chainDisplayName: getChainDisplayName(chainName),
      };
    };
    return {
      from: buildSide(transaction?.from_currency, fromChainName),
      to: buildSide(transaction?.to_currency, toChainName),
    };
  }, [transaction, walletCoins, currencies]);
};

export default useSwapCoinDisplay;
