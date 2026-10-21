// `react-google-recaptcha-v3` for the extension. reCAPTCHA is a remote script
// (blocked by the extension CSP) and is bound to registered web domains, so
// it cannot run here. utils/apiCaptcha is overridden to get tokens from the
// web wallet's /ext-captcha/ page in a hidden iframe instead.
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
