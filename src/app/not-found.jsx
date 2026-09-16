'use client';
import LegacyRouteRedirect from 'components/LegacyRouteRedirect';

// Unknown URLs. Without this page Next renders its default 404, AppRouting
// stashes that path as the login redirect target, and the user loops between
// login and the 404. Legacy paths are forwarded; anything else lands on the
// wallet Home (or login / onboarding when there is no wallet yet).
export default function NotFound() {
  return <LegacyRouteRedirect fallbackToHome />;
}
