// `react-google-recaptcha-v3` for the extension. reCAPTCHA is a remote script
// (blocked by the extension CSP) and is bound to registered web domains, so
// the extension never has a token. utils/apiCaptcha is overridden to send the
// extension's app header instead of waiting for one.
import React from 'react';

export const GoogleReCaptchaProvider = ({children}) => <>{children}</>;

export const useGoogleReCaptcha = () => ({executeRecaptcha: undefined});

export const GoogleReCaptcha = () => null;

export const withGoogleReCaptcha = Component => {
  const WithGoogleReCaptcha = props => (
    <Component
      {...props}
      googleReCaptchaProps={{executeRecaptcha: undefined}}
    />
  );
  return WithGoogleReCaptcha;
};
