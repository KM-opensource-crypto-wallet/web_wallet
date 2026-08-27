'use client';

import s from './ActiveLink.module.css';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {getActiveNavSegment} from 'utils/common';

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

  const handleClick = event => {
    if (event.target.innerText === 'Reset Wallet') {
      setPage('Reset Wallet');
      setModal(true);
      event.preventDefault();
    } else if (event.target.innerText === 'Logout') {
      setPage('LogOut');
      setModal(true);
      event.preventDefault();
    }
  };

  return (
    <Link href={href} className={s.item} style={style} onClick={handleClick}>
      {children}
    </Link>
  );
}

export default ActiveLink;
