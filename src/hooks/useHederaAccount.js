import {useEffect, useState} from 'react';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';

// Hedera keeps two identifiers per account: the EVM address (the coin's
// `address`, fixed from the key) and the ledger account id `0.0.N`, which only
// exists once the first deposit has created the account (HIP-583). These hooks
// resolve one from the other so Receive, Send and the transfer summary share
// the same cancel-on-change lookup instead of three hand-rolled effects.

/**
 * Resolves a typed recipient (EVM address or `0.0.N`) via the mirror node.
 * `getHederaChain` must return a HederaChain executor (memoised by the caller).
 * `debounceMs` delays the lookup while the user is still typing.
 *
 * Returns `{status, result}`: status is 'idle' (no address), 'resolving',
 * 'done' (result holds `{inputType, exists, accountId, evmAddress}`) or
 * 'error' (result null, e.g. the lookup itself failed).
 */
export const useHederaRecipientLookup = ({
  address,
  getHederaChain,
  debounceMs = 0,
}) => {
  const value = address?.trim() || '';
  const [state, setState] = useState({status: 'idle', result: null, value});

  useEffect(() => {
    if (!value) {
      setState({status: 'idle', result: null, value});
      return;
    }
    let cancelled = false;
    setState({status: 'resolving', result: null, value});
    const run = async () => {
      try {
        const result = await getHederaChain().lookupAddressIdentifiers({
          address: value,
        });
        if (!cancelled) {
          setState({status: 'done', result, value});
        }
      } catch (e) {
        if (!cancelled) {
          setState({status: 'error', result: null, value});
        }
      }
    };
    const timer = setTimeout(run, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, getHederaChain, debounceMs]);

  // Never hand back a result that belongs to a previous address.
  if (state.value !== value) {
    return {status: value ? 'resolving' : 'idle', result: null};
  }
  return {status: state.status, result: state.result};
};

/**
 * The coin's own ledger account id. Uses the stored `accountId` when the coin
 * already carries one; otherwise, for an unactivated Hedera coin, asks the
 * ledger once (covers a wallet funded since the last coin refresh).
 */
export const useHederaAccountId = ({coin, phrase}) => {
  const isHedera = coin?.chain_name === 'hedera';
  const storedAccountId = coin?.accountId;
  const [liveIds, setLiveIds] = useState(null);

  useEffect(() => {
    if (!isHedera || storedAccountId) {
      setLiveIds(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const chain = getChain(coin?.chain_name, phrase);
        const ids = await chain.getAccountIdentifiers({
          address: coin?.address,
          privateKey: coin?.privateKey,
        });
        if (!cancelled) {
          setLiveIds(ids);
        }
      } catch (error) {
        console.error('Error resolving hedera account identifiers', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isHedera,
    storedAccountId,
    coin?.chain_name,
    coin?.address,
    coin?.privateKey,
    phrase,
  ]);

  return storedAccountId ?? liveIds?.accountId;
};
