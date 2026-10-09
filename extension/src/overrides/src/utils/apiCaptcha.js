// Extension `utils/apiCaptcha`.
//
// The web build attaches a reCAPTCHA v3 token to every DokApi request, and
// waits up to 5 s per request for the reCAPTCHA script. reCAPTCHA cannot run
// in an extension page (remote script, domain-bound site key), so here the
// interceptor only identifies the client:
//   x-app-name: <brand>-<EXT_APP_NAME_SUFFIX>   (default: <brand>-web)
// The API only accepts known app names (dokwallet-web, -ios, ...), so the
// default reuses the web name, which it accepts without a captcha token. A
// dedicated suffix (e.g. `extension`) must be added to the backend first.
import {DokApi} from 'dok-wallet-blockchain-networks/config/dokApi';

export * from '@web-original/src/utils/apiCaptcha';

const BOOTSTRAP_URL = '/get-white-label';
const SUFFIX = process.env.EXT_APP_NAME_SUFFIX || 'web';
let interceptorId = null;

// Root.jsx calls this as soon as the white-label data is known, before the
// first app request; setWhiteLabelInfo calls it again with the same name.
export const setupWebCaptchaInterceptor = appName => {
  if (interceptorId !== null) {
    DokApi.interceptors.request.eject(interceptorId);
  }
  interceptorId = DokApi.interceptors.request.use(requestConfig => {
    if (appName && requestConfig.url !== BOOTSTRAP_URL) {
      requestConfig.headers['x-app-name'] = `${appName}-${SUFFIX}`;
    }
    return requestConfig;
  });
};
