// Structured logging for WalletConnect. Forwards to Sentry (structured log +
// breadcrumb) via services/logger, which also mirrors to the console in dev.
//
// Never pass private keys, mnemonics, or full request params; log only
// identifiers: method, chainId, topic, requestId, peer name/url.
import {addBreadcrumb, logger} from 'services/logger';

const LEVELS = {log: 'info', info: 'info', warn: 'warn', error: 'error'};
const BREADCRUMB_LEVELS = {info: 'info', warn: 'warning', error: 'error'};

export const logWalletConnectEvent = (level, event, details = {}) => {
  const normalized = LEVELS[level] || 'info';
  logger[normalized](`walletconnect.${event}`, details);
  addBreadcrumb('walletconnect', event, details, BREADCRUMB_LEVELS[normalized]);
};
