import {useCallback, useEffect, useState, useTransition} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';

export const useResetWallet = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [infoOpen, setInfoOpen] = useState(false);
  const query = searchParams?.toString() ? `?${searchParams}` : '';
  const createPath = `/auth/create-wallet${query}`;
  const importPath = `/auth/import-wallet${query}`;
  // Navigation finishes only once the next page's code has loaded; until then
  // the picked card shows a spinner instead of looking unresponsive.
  const [isNavigating, startNavigation] = useTransition();
  const [picked, setPicked] = useState(null);

  // Load both next pages while the user reads, so the click is instant.
  useEffect(() => {
    router.prefetch(createPath);
    router.prefetch(importPath);
  }, [router, createPath, importPath]);

  const go = path => {
    setPicked(path);
    startNavigation(() => router.push(path));
  };

  const openInfo = useCallback(() => setInfoOpen(true), []);
  const closeInfo = useCallback(() => setInfoOpen(false), []);

  return {
    infoOpen,
    openInfo,
    closeInfo,
    isNavigating,
    isCreateBusy: isNavigating && picked === createPath,
    isImportBusy: isNavigating && picked === importPath,
    goToCreate: () => go(createPath),
    goToImport: () => go(importPath),
  };
};

export default useResetWallet;
