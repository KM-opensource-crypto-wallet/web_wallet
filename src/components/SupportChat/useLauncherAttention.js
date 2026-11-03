import {useCallback, useEffect, useState} from 'react';

const FIRST_MS = 10000;
const TEASER_MS = 9000;
const BOUNCE_MS = 1600;
const REPEAT_MS = 45000;
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
 * Draws attention to the launcher while the user has not opened the chat yet:
 * a short bounce now and then, and a one-time "Need help?" teaser per session.
 * Stops entirely once `active` turns false (chat opened, hidden or disabled).
 */
export const useLauncherAttention = active => {
  const [bounce, setBounce] = useState(false);
  const [teaser, setTeaser] = useState(false);

  useEffect(() => {
    if (!active) {
      (() => {
        setBounce(false);
        setTeaser(false);
      })();
      return undefined;
    }
    const timers = [];
    const pulse = () => {
      setBounce(true);
      timers.push(setTimeout(() => setBounce(false), BOUNCE_MS));
    };
    timers.push(
      setTimeout(() => {
        pulse();
        if (!readSeen()) {
          writeSeen();
          setTeaser(true);
          timers.push(setTimeout(() => setTeaser(false), TEASER_MS));
        }
      }, FIRST_MS),
    );
    const interval = setInterval(pulse, REPEAT_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [active]);

  const dismissTeaser = useCallback(() => setTeaser(false), []);
  return {bounce, teaser, dismissTeaser};
};
