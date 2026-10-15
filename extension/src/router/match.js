// Matches a pathname against the generated route table, Next-style: the table
// is pre-sorted (static before dynamic before catch-all), so the first match
// wins. Param values stay percent-encoded, as Next's useParams returns them.
const splitPath = pathname => pathname.split('/').filter(Boolean);

const matchSegments = (segments, parts) => {
  const params = {};
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const part = parts[i];
    if (segment.type === 'optionalCatchAll' || segment.type === 'catchAll') {
      const rest = parts.slice(i);
      if (segment.type === 'catchAll' && !rest.length) {
        return null;
      }
      if (rest.length) {
        params[segment.name] = rest;
      }
      return params;
    }
    if (part === undefined) {
      return null;
    }
    if (segment.type === 'static') {
      if (segment.value !== part) {
        return null;
      }
    } else {
      params[segment.name] = part;
    }
  }
  return segments.length === parts.length ? params : null;
};

export const matchRoute = (routes, pathname) => {
  const parts = splitPath(pathname);
  for (const route of routes) {
    const params = matchSegments(route.segments, parts);
    if (params) {
      return {route, params};
    }
  }
  return null;
};
