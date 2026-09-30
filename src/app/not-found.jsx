'use client';
import {useContext} from 'react';
import Link from 'next/link';
import {ReactReduxContext} from 'react-redux';
import LegacyRouteRedirect from 'components/LegacyRouteRedirect';

// Unknown URLs. Without this page Next renders its default 404, AppRouting
// stashes that path as the login redirect target, and the user loops between
// login and the 404. Legacy paths are forwarded; anything else lands on the
// wallet Home (or login / onboarding when there is no wallet yet).
//
// Next also renders this page for a form Server Action request it cannot
// handle (bots POSTing a `Next-Action` header to `/`), and that render has no
// root layout (createNotFoundLoaderTree), so there is no redux Provider:
// LegacyRouteRedirect's useSelector would throw. Serve a plain 404 there.
export default function NotFound() {
  const hasStore = useContext(ReactReduxContext) != null;
  if (!hasStore) {
    return (
      <div style={{padding: 24, textAlign: 'center'}}>
        <h3>Page not found</h3>
        <Link href='/'>Go to home</Link>
      </div>
    );
  }
  return <LegacyRouteRedirect fallbackToHome />;
}
