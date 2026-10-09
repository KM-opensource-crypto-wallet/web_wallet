// Extension `utils/localStorageData`: the web helpers, plus activity reported
// to the unlock session so the service worker's auto-lock sees it while no
// page is open (src/extension/session.js).
import {setLastActiveTime as setWebLastActiveTime} from '@web-original/src/utils/localStorageData';
import {touchSession} from '@ext/extension/session';

export * from '@web-original/src/utils/localStorageData';

export const setLastActiveTime = () => {
  setWebLastActiveTime();
  touchSession();
};
