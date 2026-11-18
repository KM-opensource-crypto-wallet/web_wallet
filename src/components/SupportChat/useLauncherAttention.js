import {useEffect, useState} from 'react';

const FIRST_MS = 10000;
const TEASER_MS = 9000;
const SEEN_KEY = 'supportChatTeaserSeen';

const readSeen = () => {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

const writeSeen = () => {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Storage can be blocked; the teaser then shows once per page load.
  }
};

/**
 * Shows a one-time "Need help?" teaser per session while the user has not
 * opened the chat yet. Stops once `active` turns false (chat opened or disabled).
 */
export const useLauncherAttention = active => {
  const [teaser, setTeaser] = useState(false);

  useEffect(() => {
    if (!active) {
      (() => setTeaser(false))();
      return undefined;
    }
    let hideTimer;
    const showTimer = setTimeout(() => {
      if (readSeen()) return;
      writeSeen();
      setTeaser(true);
      hideTimer = setTimeout(() => setTeaser(false), TEASER_MS);
    }, FIRST_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [active]);

  return {teaser};
};
