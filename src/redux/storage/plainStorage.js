// redux-persist `Storage` for the slices that must be readable before login
// (`auth` without the password, `settings`). Plain IndexedDB, no encryption:
// the browser has no hardware store to hold a key in, and these slices carry
// nothing privacy-relevant. Every call awaits the storage bootstrap so the
// redux store stays a synchronous export.
import {bootstrapStorage} from './bootstrap';
import {plainKv} from './stateDb';

const isBrowser = () => typeof window !== 'undefined';

export const plainStorage = {
  getItem: async key => {
    if (!isBrowser()) {
      return null;
    }
    await bootstrapStorage();
    const value = await plainKv.get(key);
    return typeof value === 'string' ? value : null;
  },
  setItem: async (key, value) => {
    if (!isBrowser()) {
      return;
    }
    await bootstrapStorage();
    await plainKv.set(key, value);
  },
  removeItem: async key => {
    if (!isBrowser()) {
      return;
    }
    await bootstrapStorage();
    await plainKv.remove(key);
  },
};
