// `next/navigation` for the extension, backed by the hash router.
import {useMemo} from 'react';
import {history} from '@ext/router/history';
import {useLocationSnapshot} from '@ext/router/RouteOutlet';

export class ReadonlyURLSearchParams extends URLSearchParams {}

export const useRouter = () => history;

export const usePathname = () => useLocationSnapshot().pathname;

export const useSearchParams = () => {
  const {search} = useLocationSnapshot();
  return useMemo(() => new ReadonlyURLSearchParams(search), [search]);
};

export const useParams = () => useLocationSnapshot().params;

export const useSelectedLayoutSegments = () =>
  useLocationSnapshot().pathname.split('/').filter(Boolean);

export const useSelectedLayoutSegment = () =>
  useSelectedLayoutSegments()[0] ?? null;

// Next throws to abort rendering; here the navigation is enough.
export const redirect = href => {
  history.replace(href);
};
export const permanentRedirect = redirect;

export const notFound = () => {
  history.replace('/404');
};

export const RedirectType = {push: 'push', replace: 'replace'};
