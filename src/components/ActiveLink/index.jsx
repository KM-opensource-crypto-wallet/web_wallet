'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {getActiveNavSegment} from 'utils/common';

const MODAL_PAGES = {
  '/reset-wallet': 'Reset Wallet',
  '/logout': 'LogOut',
};

function ActiveLink({
  children,
  href,
  setModal,
  setPage,
  className,
  activeClassName,
}) {
  const path = usePathname();
  const pathname = getActiveNavSegment(path);
  // href may be wallet-scoped (/wallet/{id}/buy-crypto) - normalize it the
  // same way as pathname before comparing.
  const isActive = pathname === getActiveNavSegment(href);

  // These two sidebar entries open a modal instead of navigating. Matching
  // on the href (not the translated label) keeps that working in every
  // locale, and skipping prefetch avoids a 404 for the pseudo-route
  // `/reset-wallet`, which has no page of its own.
  const modalPage = MODAL_PAGES[href];

  const handleClick = event => {
    if (modalPage) {
      setPage(modalPage);
      setModal(true);
      event.preventDefault();
    }
  };

  return (
    <Link
      href={href}
      className={[className, isActive && activeClassName]
        .filter(Boolean)
        .join(' ')}
      aria-current={isActive ? 'page' : undefined}
      onClick={handleClick}
      prefetch={modalPage ? false : undefined}>
      {children}
    </Link>
  );
}

export default ActiveLink;
