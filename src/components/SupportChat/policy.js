const APP_ORIGIN = 'https://app.invalid';
// Control characters, whitespace and backslashes are never valid in a KB link.
const UNSAFE_HREF = /[\u0000- \u007f-\u009f\\]/;

// Turns the current URL into a route pattern by replacing every dynamic value
// with its [name], so the backend never receives wallet ids or addresses.
export const getRoutePattern = (pathname, params) => {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return null;
  const names = new Map();
  Object.entries(params || {}).forEach(([name, value]) => {
    [].concat(value).forEach(item => {
      if (typeof item === 'string' && item) names.set(item, name);
    });
  });
  return pathname
    .split('/')
    .map(segment => {
      if (!segment) return segment;
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        // Keep the raw segment.
      }
      const name = names.get(segment) ?? names.get(decoded);
      return name ? `[${name}]` : segment;
    })
    .join('/');
};

export const isAllowedHref = (href, linkHosts) => {
  if (typeof href !== 'string' || href === '' || UNSAFE_HREF.test(href)) {
    return false;
  }
  if (href.startsWith('/')) {
    try {
      return new URL(href, APP_ORIGIN).origin === APP_ORIGIN;
    } catch {
      return false;
    }
  }
  if (!Array.isArray(linkHosts) || linkHosts.length === 0) return false;
  try {
    const url = new URL(href);
    return (
      url.protocol === 'https:' &&
      linkHosts.some(h => String(h).toLowerCase() === url.hostname)
    );
  } catch {
    return false;
  }
};

// The hrefs come from utils/contactSupport (subject and Support ID prefilled,
// Telegram only for brands with a support account); empty means not offered.
export const getContactOptions = ({emailHref, telegramHref, unlocked}) => {
  const options = [];
  if (typeof emailHref === 'string' && emailHref) {
    options.push({type: 'email', href: emailHref});
  }
  if (typeof telegramHref === 'string' && telegramHref) {
    options.push({type: 'telegram', href: telegramHref});
  }
  if (unlocked) {
    options.push({type: 'contactUs', href: '/contact-us'});
  }
  return options;
};

// react-markdown options: raw HTML stays escaped text (no rehype-raw), images
// are never rendered, and skipHtml stays off so text such as <coin> survives.
export const MARKDOWN_PROPS = Object.freeze({
  disallowedElements: Object.freeze(['img']),
});
