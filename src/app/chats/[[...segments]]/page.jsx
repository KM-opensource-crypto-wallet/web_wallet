'use client';
import LegacyRouteRedirect from 'components/LegacyRouteRedirect';

// The chat feature was retired on web; bookmarks land on the wallet Home.
export default function LegacyRedirectPage() {
  return <LegacyRouteRedirect />;
}
