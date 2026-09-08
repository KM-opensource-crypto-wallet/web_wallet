// Structured logging for WalletConnect. The app has no crash/analytics SDK
// today, so this writes to the console (browser devtools / Next server log).
// When one is added, forward from here so every call site picks it up.
//
// Never pass private keys, mnemonics, or full request params; log only
// identifiers: method, chainId, topic, requestId, peer name/url.
export const logWalletConnectEvent = (level, event, details = {}) => {
  const payload = {ts: new Date().toISOString(), event, ...details};
  const log = console[level] || console.log;
  log(`[WalletConnect] ${event}`, JSON.stringify(payload));
};
