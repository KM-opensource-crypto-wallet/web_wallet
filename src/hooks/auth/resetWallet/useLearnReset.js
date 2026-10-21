import {useRouter} from 'next/navigation';
import {LEARN_MORE_URL} from 'src/data/constants';

// The page is public and can be opened directly (no history to go back to),
// so back falls back to the app's entry.
export const useLearnReset = () => {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return {
    goBack,
    learnMoreUrl: LEARN_MORE_URL,
  };
};

export default useLearnReset;
