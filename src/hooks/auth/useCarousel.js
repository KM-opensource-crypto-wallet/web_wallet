import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useDispatch} from 'react-redux';
import data from 'src/data/lists/carousel';
import {canRestoreFromVault} from 'security/vaultRecovery';
import useWallet from 'src/hooks/wallet/useWallet';
import {CAROUSEL_LAST_INDEX, SWIPE_THRESHOLD_PX} from 'src/data/constants';

export const useCarousel = () => {
  const [index, setIndex] = useState(0);

  const router = useRouter();
  const {hasAccount: storePassword} = useWallet();
  const searchParams = useSearchParams();
  const swipeStartX = useRef(null);
  const dispatch = useDispatch();
  // Keys from earlier are still in this browser (vault without an account).
  const [canRestore, setCanRestore] = useState(false);

  useEffect(() => {
    dispatch(canRestoreFromVault())
      .then(setCanRestore)
      .catch(() => setCanRestore(false));
  }, [dispatch]);

  const isLast = index === CAROUSEL_LAST_INDEX;

  const goTo = useCallback(
    next => setIndex(Math.min(Math.max(next, 0), CAROUSEL_LAST_INDEX)),
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

  const handleRestore = () => {
    router.push(
      `/auth/restore-from-device${searchParams ? `?${searchParams}` : ''}`,
    );
  };

  useEffect(() => {
    const onKeyDown = e => {
      if (e.key === 'ArrowRight') {
        setIndex(i => Math.min(i + 1, CAROUSEL_LAST_INDEX));
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
    last: CAROUSEL_LAST_INDEX,
    trackStyle,
    goTo,
    handleGetStarted,
    canRestore,
    handleRestore,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
  };
};

export default useCarousel;
