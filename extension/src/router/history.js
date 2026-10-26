// Hash-based location for the extension pages.
//
// Extension pages are files (app.html); a path like /wallet/x/home has no file
// behind it, so a reload would 404. The app path therefore lives in the hash:
//   chrome-extension://<id>/app.html#/wallet/x/home/?tab=1
// Pathnames keep the trailing slash the web build gets from Next's
// `trailingSlash: true`, which the web code compares against.
import {routes} from '@generated/routes';
import {matchRoute} from './match';

const listeners = new Set();

export const normalizePathname = pathname => {
  let value = pathname || '/';
  if (!value.startsWith('/')) {
    value = `/${value}`;
  }
  return value.endsWith('/') ? value : `${value}/`;
};

// '/a/b?x=1#frag' -> {pathname: '/a/b/', search: '?x=1'}
const parse = href => {
  const url = new URL(href, 'https://ext.invalid');
  return {pathname: normalizePathname(url.pathname), search: url.search};
};

const readLocation = () => {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  return parse(raw);
};

const buildSnapshot = () => {
  const {pathname, search} = readLocation();
  const match = matchRoute(routes, pathname);
  return {
    pathname,
    search,
    searchParams: new URLSearchParams(search),
    route: match?.route ?? null,
    params: match?.params ?? {},
  };
};

let snapshot = buildSnapshot();

const notify = () => {
  snapshot = buildSnapshot();
  listeners.forEach(listener => listener());
};

window.addEventListener('popstate', notify);
window.addEventListener('hashchange', notify);

export const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSnapshot = () => snapshot;

const toHash = href => {
  const {pathname, search} = parse(href);
  return `#${pathname}${search}`;
};

const isExternal = href => /^[a-z][a-z0-9+.-]*:/i.test(href);

// Relative hrefs ("send-funds", "?tab=2") resolve against the current path,
// as they do in the browser.
const resolveHref = href => {
  if (href.startsWith('/')) {
    return href;
  }
  const base = `https://ext.invalid${snapshot.pathname}${snapshot.search}`;
  const url = new URL(href, base);
  return `${url.pathname}${url.search}`;
};

const navigate = (href, method) => {
  if (href == null) {
    return;
  }
  const value = typeof href === 'string' ? href : String(href);
  if (isExternal(value)) {
    window.open(value, '_blank', 'noopener,noreferrer');
    return;
  }
  const target = toHash(resolveHref(value));
  if (target === window.location.hash) {
    return;
  }
  window.history[method](null, '', target);
  notify();
  if (method === 'pushState') {
    window.scrollTo(0, 0);
  }
};

export const history = {
  push: href => navigate(href, 'pushState'),
  replace: href => navigate(href, 'replaceState'),
  back: () => window.history.back(),
  forward: () => window.history.forward(),
  // Next re-renders server components; there are none here.
  refresh: () => notify(),
  prefetch: () => Promise.resolve(),
  hrefFor: href =>
    isExternal(String(href)) ? String(href) : toHash(resolveHref(String(href))),
};
