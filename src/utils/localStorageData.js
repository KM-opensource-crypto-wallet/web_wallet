'use client';

export const getThemeFromLocalStorage = () =>
  typeof window !== 'undefined' && window.localStorage.getItem('theme');
export const setThemeToLocalStorage = value =>
  typeof window !== 'undefined' && window.localStorage.setItem('theme', value);

export const clearWalletConnectStorageCache = async () => {
  try {
    for (const key in localStorage) {
      if (key.startsWith('wc@2')) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error('error in clearWalletConnectStorageCache');
  }
};

export const createAIDIfNotExists = aid => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('aid', aid);
  }
};

export const getAIDFromLocalStorage = () =>
  typeof window !== 'undefined' && window.localStorage.getItem('aid');

/** Read from localStorage safely */
export const getLocalStorageData = key => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
};

/** Save to localStorage safely */
export const setLocalStorageData = (key, value) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
};

/** Remove value from localStorage safely */
export const removeLocalStorageData = key => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
};
