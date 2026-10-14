import {useCallback} from 'react';
import {useRouter} from 'next/navigation';

export const useNavigation = () => {
  const router = useRouter();

  const goBack = useCallback(() => router.back(), [router]);

  return {
    goBack,
  };
};

export default useNavigation;
