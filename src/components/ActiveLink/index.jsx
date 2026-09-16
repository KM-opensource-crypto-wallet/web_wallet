'use client';

import s from './ActiveLink.module.css';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {getActiveNavSegment} from 'utils/common';

const MODAL_PAGES = {
  '/reset-wallet': 'Reset Wallet',
  '/logout': 'LogOut',
};

function ActiveLink({children, href, setModal, setPage}) {
  const path = usePathname();
  const pathname = getActiveNavSegment(path);
  // href may be wallet-scoped (/wallet/{id}/buy-crypto) - normalize it the
  // same way as pathname before comparing.
  const isActive = pathname === getActiveNavSegment(href);

  const style = {
    color: isActive ? 'var(--background)' : 'var(--gray)',
    fill: isActive ? 'var(--background)' : 'var(--gray)',
  };

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
      className={s.item}
      style={style}
      onClick={handleClick}
      prefetch={modalPage ? false : undefined}>
      {children}
    </Link>
  );
}

export default ActiveLink;
