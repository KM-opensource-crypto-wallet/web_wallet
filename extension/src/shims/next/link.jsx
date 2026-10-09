// `next/link` for the extension: an anchor to the hash route, navigated
// client-side. Modified clicks (new tab, etc.) keep the browser default.
import React, {forwardRef} from 'react';
import {history} from '@ext/router/history';

const hrefToString = href => {
  if (href && typeof href === 'object') {
    const query = href.query ? `?${new URLSearchParams(href.query)}` : '';
    return `${href.pathname || ''}${query}${href.hash || ''}`;
  }
  return String(href ?? '');
};

const Link = forwardRef(function Link(
  {
    href,
    replace,
    scroll,
    prefetch,
    shallow,
    legacyBehavior,
    passHref,
    onClick,
    children,
    ...rest
  },
  ref,
) {
  const target = hrefToString(href);
  const external = /^[a-z][a-z0-9+.-]*:/i.test(target);
  const handleClick = event => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      external ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (rest.target && rest.target !== '_self')
    ) {
      return;
    }
    event.preventDefault();
    if (replace) {
      history.replace(target);
    } else {
      history.push(target);
    }
  };
  return (
    <a
      ref={ref}
      href={history.hrefFor(target)}
      onClick={handleClick}
      {...(external ? {target: '_blank', rel: 'noopener noreferrer'} : {})}
      {...rest}>
      {children}
    </a>
  );
});

export default Link;
