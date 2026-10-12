import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useSelector} from 'react-redux';
import {getHasAccount} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import data from 'data/carousel';

const LAST = data.length - 1;
const SWIPE_THRESHOLD_PX = 50;

export const useCarousel = () => {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const storePassword = useSelector(getHasAccount);
  const searchParams = useSearchParams();
  const swipeStartX = useRef(null);

  const isLast = index === LAST;

  const goTo = useCallback(
    next => setIndex(Math.min(Math.max(next, 0), LAST)),
    [],
  );

  const handleGetStarted = () => {
    const searchParamsStr = `${searchParams ? `?${searchParams}` : ''}`;

    if (storePassword) {
      router.push(`/auth/login${searchParamsStr}`);
    } else {
      router.push(`/auth/registration${searchParamsStr}`);
    }
  };

  useEffect(() => {
    const onKeyDown = e => {
      if (e.key === 'ArrowRight') {
        setIndex(i => Math.min(i + 1, LAST));
      } else if (e.key === 'ArrowLeft') {
        setIndex(i => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onPointerDown = e => {
    if (e.target.closest('button')) {
      return;
    }
    swipeStartX.current = e.clientX;
  };

  const onPointerUp = e => {
    if (swipeStartX.current === null) {
      return;
    }
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
      goTo(index + (dx < 0 ? 1 : -1));
    }
  };

  const onPointerCancel = () => {
    swipeStartX.current = null;
  };

  const trackStyle = {transform: `translateX(-${index * 100}%)`};

  return {
    data,
    index,
    isLast,
    last: LAST,
    trackStyle,
    goTo,
    handleGetStarted,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
  };
};

export default useCarousel;
