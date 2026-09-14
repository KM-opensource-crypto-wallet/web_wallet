import {findCoinByCurrency, getCoinSlug} from 'utils/common';
import {coinRoutes, stripTrailingSlash, walletRoutes} from 'utils/routes';

// Maps every pre-/wallet/{clientId} URL (and the wallet-agnostic payment link)
// onto its current equivalent. Pure: the caller supplies the active wallet and
// coin, and performs the navigation.
//
// Returns {path, query, toast?} or null when the pathname is not a legacy
// route at all.

export const CURRENCY_NOT_FOUND_TOAST =
  'Currency not found in the selected wallet';

// /home/send/<leaf> pages that live under the coin slug.
const SEND_LEAF_ROUTES = {
  'send-funds': coinRoutes.sendFunds,
  'send-funds/transfer': coinRoutes.transfer,
  'receive-funds': coinRoutes.receiveFunds,
  'select-UTXOs': coinRoutes.selectUtxos,
  'custom-derivation': coinRoutes.customDerivation,
};

// /home/<segment> pages that live under the coin slug. Any trailing path
// (transactions/<txHash>, transactions/update-transaction) is kept.
const COIN_SCOPED_HOME_SEGMENTS = [
  'transactions',
  'staking-list',
  'create-staking',
  'vote-staking',
  'withdraw-staking',
  'confirm-staking',
];

// /home/<segment> pages that stay wallet-scoped (no coin in the path).
const WALLET_SCOPED_HOME_SEGMENTS = ['coin-sync', 'confirm-batch'];

// First path segment allowed after /home/send/<slug>/ in the new shape.
const COIN_PAGE_SEGMENTS = new Set([
  ...COIN_SCOPED_HOME_SEGMENTS,
  ...Object.keys(SEND_LEAF_ROUTES).map(leaf => leaf.split('/')[0]),
]);

// Features retired on web; bookmarks land on the wallet Home.
const RETIRED_ROUTES = ['/chats'];

// Flat top-level routes that moved 1:1 under /wallet/{clientId}.
const WALLET_SCOPED_PREFIXES = [
  '/buy-crypto',
  '/sell-crypto',
  '/swap',
  '/manage-coins',
  '/wallet-connect',
  '/receive-payment-url',
  '/verify/verify-create',
  '/verify/verify-screen',
  '/wallets/hide-wallet',
];

const cleanQuery = (searchParams, dropKeys = []) => {
  const params = new URLSearchParams();
  searchParams?.forEach((value, key) => {
    // The login replay appends a trailing '&', which yields an empty key.
    if (key && !dropKeys.includes(key)) {
      params.append(key, value);
    }
  });
  return params.toString();
};

const joinRest = (base, rest) =>
  rest.length ? `${base}/${rest.join('/')}` : base;

const resolveHome = ({
  segments,
  searchParams,
  clientId,
  coins,
  currentCoinSlug,
}) => {
  const query = cleanQuery(searchParams);
  const [first, ...rest] = segments;
  const home = {path: walletRoutes.home(clientId), query};

  if (!first) {
    return home;
  }

  if (first === 'send') {
    if (rest.length === 0) {
      return currentCoinSlug
        ? {path: coinRoutes.send(clientId, currentCoinSlug), query}
        : home;
    }

    const leaf = rest.join('/');
    if (leaf === 'send-funds' && searchParams?.get('currency')) {
      const coin = findCoinByCurrency(coins, searchParams.get('currency'));
      const strippedQuery = cleanQuery(searchParams, ['currency']);
      if (!coin) {
        return {
          path: walletRoutes.home(clientId),
          query: strippedQuery,
          toast: CURRENCY_NOT_FOUND_TOAST,
        };
      }
      return {
        path: coinRoutes.sendFunds(clientId, getCoinSlug(coin)),
        query: strippedQuery,
      };
    }

    if (SEND_LEAF_ROUTES[leaf]) {
      return currentCoinSlug
        ? {path: SEND_LEAF_ROUTES[leaf](clientId, currentCoinSlug), query}
        : home;
    }

    // New wallet-agnostic shape: /home/send/<slug>/<rest>. The coin guard
    // layout validates the slug once we land there; an unknown page under
    // the slug would 404, so it falls back to the coin's Send screen.
    const [slug, ...slugRest] = rest;
    const knownRest = !slugRest.length || COIN_PAGE_SEGMENTS.has(slugRest[0]);
    return {
      path: joinRest(
        coinRoutes.send(clientId, slug),
        knownRest ? slugRest : [],
      ),
      query,
    };
  }

  if (COIN_SCOPED_HOME_SEGMENTS.includes(first)) {
    if (!currentCoinSlug) {
      return home;
    }
    return {
      path: joinRest(
        `${coinRoutes.send(clientId, currentCoinSlug)}/${first}`,
        rest,
      ),
      query,
    };
  }

  if (WALLET_SCOPED_HOME_SEGMENTS.includes(first)) {
    return {
      path: joinRest(`${walletRoutes.home(clientId)}/${first}`, rest),
      query,
    };
  }

  // Anything else never existed under /home; forwarding it would 404 and
  // bounce through login forever, so land on Home instead.
  return home;
};

export const resolveLegacyRoute = ({
  pathname,
  searchParams,
  clientId,
  coins,
  currentCoinSlug,
}) => {
  const path = stripTrailingSlash(pathname);
  if (!path || !clientId) {
    return null;
  }

  if (path === '/home' || path.startsWith('/home/')) {
    const segments = path.split('/').slice(2).filter(Boolean);
    return resolveHome({
      segments,
      searchParams,
      clientId,
      coins,
      currentCoinSlug,
    });
  }

  const isRetired = RETIRED_ROUTES.some(
    prefix => path === prefix || path.startsWith(`${prefix}/`),
  );
  if (isRetired) {
    return {path: walletRoutes.home(clientId), query: cleanQuery(searchParams)};
  }

  const isWalletScoped = WALLET_SCOPED_PREFIXES.some(
    prefix => path === prefix || path.startsWith(`${prefix}/`),
  );
  if (isWalletScoped) {
    return {
      path: `/wallet/${clientId}${path}`,
      query: cleanQuery(searchParams),
    };
  }

  return null;
};
