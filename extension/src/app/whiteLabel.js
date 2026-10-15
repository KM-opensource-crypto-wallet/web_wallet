// White-label data for the extension. The web root layout fetches it per
// request from the Host header; the extension has a fixed brand domain
// (extension.config.js) and keeps the last answer in chrome.storage.local so
// the panel opens immediately and still works when the backend is slow.
import {getWhiteLabelInfo} from 'dok-wallet-blockchain-networks/service/dokApi';

const CACHE_KEY = 'wlData';

const fetchFresh = async () => {
  const response = await getWhiteLabelInfo(process.env.EXT_WHITE_LABEL_DOMAIN);
  const data = response?.data;
  if (!data) {
    throw new Error('White-label lookup returned no data');
  }
  await chrome.storage.local.set({[CACHE_KEY]: data});
  return data;
};

/** Cached data at once (refreshed in the background), else a fresh fetch. */
export const loadWhiteLabel = async () => {
  const cached = (await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY];
  if (cached) {
    fetchFresh().catch(() => {});
    return cached;
  }
  return fetchFresh();
};
