'use client';
import LegacyRouteRedirect from 'components/LegacyRouteRedirect';

// Wallet-agnostic payment link: /wallet/home/send/<coinSlug>/send-funds.
// The payer opens it on their own wallet, so it is forwarded to the active
// wallet's equivalent page. Static sibling of [clientId]: Next matches this
// folder first for /wallet/home/*, and /wallet/<id>/home/* is untouched.
export default function WalletAgnosticRedirectPage() {
  return <LegacyRouteRedirect />;
}
