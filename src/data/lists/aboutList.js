import {getPrivacyUrl, getTermsUrl} from 'whitelabel/whiteLabelInfo';

const icons = require(`assets/images/icons`).default;

export const aboutList = [
  {
    page: 'Terms & Conditions',
    icon: icons.tc,
    route: '/about/terms-conditions',
    url: getTermsUrl(),
  },
  {
    page: 'Privacy Policy',
    icon: icons.privacyPolicy,
    route: '/about/privacy-policy',
    url: getPrivacyUrl(),
  },
];
