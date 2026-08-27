'use client';
import RedirectToWalletRoute from 'components/RedirectToWalletRoute';

export default function HideWalletPage() {
  return <RedirectToWalletRoute suffix='/home' />;
}
