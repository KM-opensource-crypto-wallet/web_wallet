'use client';
import RedirectToWalletRoute from 'components/RedirectToWalletRoute';

// Unlike every other old-URL stub (which lands on Home), this one preserves
// its query string - it's the destination of Receive Payment URL links, so
// address/amount/currency must survive the redirect for the form to prefill.
export default function SendFundsPage() {
  return <RedirectToWalletRoute suffix='/home/send/send-funds' preserveQuery />;
}
