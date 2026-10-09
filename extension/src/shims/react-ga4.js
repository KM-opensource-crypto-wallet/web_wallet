// `react-ga4` for the extension. gtag.js is a remote script, which the
// extension CSP (and Chrome Web Store policy) does not allow, so analytics
// calls are no-ops. Send GA4 Measurement Protocol events from here if needed.
const ReactGA = {
  initialize: () => {},
  send: () => {},
  event: () => {},
  set: () => {},
  gtag: () => {},
  isInitialized: false,
};

export default ReactGA;
