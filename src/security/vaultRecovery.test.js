// "Restore wallets saved on this device" (web): unlock normally when the
// sealed wallets are still on disk, otherwise rebuild every wallet from the
// vault's keys and never write the vault until all of them are back.
jest.mock('services/logger', () => ({
  addBreadcrumb: jest.fn(),
  captureError: jest.fn(),
  logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
}));
jest.mock('redux/store', () => ({
  persistor: {flush: jest.fn(async () => {})},
  vaultSync: {reset: jest.fn(), markSynced: jest.fn()},
}));
jest.mock('redux/storage/plainStorage', () => ({
  releaseBlockedWrites: jest.fn(async () => {}),
}));
jest.mock('redux/storage/sealedStorage', () => ({
  readSealed: jest.fn(async (key, stateKey) => {
    const {sealedKv} = jest.requireMock('redux/storage/stateDb');
    const raw = await sealedKv.get(key);
    if (raw === 'garbage') {
      throw new Error('decrypt failed');
    }
    return raw;
  }),
  unsealStorage: jest.fn(),
  enableSealedWrites: jest.fn(),
  sealStorage: jest.fn(),
}));
const mockSealed = new Map();
jest.mock('redux/storage/stateDb', () => ({
  sealedKv: {
    get: jest.fn(async key => mockSealed.get(key) ?? null),
    set: jest.fn(async (key, value) => {
      mockSealed.set(key, value);
    }),
  },
}));
jest.mock(
  'dok-wallet-blockchain-networks/redux/storage/legacyRootMigration',
  () => ({
    parsePersistEnvelope: raw => {
      const outer = JSON.parse(raw);
      return Object.fromEntries(
        Object.entries(outer).map(([k, v]) => [k, JSON.parse(v)]),
      );
    },
  }),
);
jest.mock('security/unlockFlow', () => ({
  AccountExistsError: class AccountExistsError extends Error {
    code = 'account_exists';
  },
  completeUnlock: jest.fn(async dispatch => {
    dispatch({type: 'auth/vaultUnlocked'});
  }),
  markSealedSlicesLoaded: jest.fn(),
}));
const mockSecure = new Map();
jest.mock('security/secureStore', () => ({
  get: jest.fn(async key => mockSecure.get(key) ?? null),
  set: jest.fn(async (key, value) => {
    mockSecure.set(key, value);
  }),
  remove: jest.fn(async key => {
    mockSecure.delete(key);
  }),
}));
jest.mock('dok-wallet-blockchain-networks/security/vault', () => ({
  hasVault: jest.fn(async () => true),
  unlockWithPassword: jest.fn(),
  getStateKey: jest.fn(async () => new Uint8Array(32)),
  lock: jest.fn(),
  isUnlocked: jest.fn(() => true),
  saveSecrets: jest.fn(async () => {}),
}));
jest.mock('dok-wallet-blockchain-networks/redux/wallets/walletsSlice', () => ({
  createWallet: data => ({type: 'wallets/createWallet', data}),
  resetWallet: () => ({type: 'wallets/resetWallet'}),
  createIfNotExistsMasterClientId: () => ({
    type: 'wallets/createIfNotExistsMasterClientId',
  }),
  reassignCurrentWalletIfHidden: () => ({
    type: 'wallets/reassignCurrentWalletIfHidden',
  }),
  resetCoinsToDefaultAddressForPrivacyMode: () => ({
    type: 'wallets/resetCoinsToDefaultAddressForPrivacyMode',
  }),
}));
jest.mock('dok-wallet-blockchain-networks/redux/auth/authSlice', () => ({
  signUpSuccess: () => ({type: 'auth/signUpSuccess'}),
  logInSuccess: () => ({type: 'auth/logInSuccess'}),
  vaultUnlocked: () => ({type: 'auth/vaultUnlocked'}),
}));
jest.mock('dok-wallet-blockchain-networks/redux/auth/authSelectors', () => ({
  getHasAccount: state => state.auth.hasAccount,
}));
jest.mock('dok-wallet-blockchain-networks/redux/wallets/walletSecrets', () => ({
  extractVaultPayload: allWallets => ({
    v: 1,
    wallets: Object.fromEntries(
      allWallets.map(w => [
        w.clientId,
        w.phrase ? {phrase: w.phrase} : {privateKey: w.privateKey},
      ]),
    ),
  }),
}));

import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {persistor, vaultSync} from 'redux/store';
import {releaseBlockedWrites} from 'redux/storage/plainStorage';
import {
  enableSealedWrites,
  sealStorage,
  unsealStorage,
} from 'redux/storage/sealedStorage';
import {completeUnlock, markSealedSlicesLoaded} from 'security/unlockFlow';
import {
  RESTORE_ATTEMPT_KEYS,
  RESTORE_ERROR_CODES,
  RESTORE_FREE_ATTEMPTS,
  buildRestorePlan,
  restoreDelayMs,
  restoreFromVault,
} from 'security/vaultRecovery';
import {isRestoringFromVault} from 'security/restoreState';

const OLD = {
  v: 1,
  wallets: {
    a: {phrase: 'alpha words', coins: {}},
    b: {
      privateKey: 'pk-b',
      coins: {ethereum_ETH: {privateKey: 'pk-b'}},
      chainExisting: {},
    },
    c: {coins: {}},
  },
};

const sealedEnvelope = allWallets =>
  JSON.stringify({allWallets: JSON.stringify(allWallets)});

// A tiny store: createWallet adds a wallet with the requested key unless
// `failOn` matches; resetWallet empties the list.
const makeStore = ({failOn} = {}) => {
  const state = {auth: {hasAccount: false}, wallets: {allWallets: []}};
  const actions = [];
  const dispatch = action => {
    if (typeof action === 'function') {
      return action(dispatch, () => state);
    }
    actions.push(action.type);
    if (action.type === 'wallets/resetWallet') {
      state.wallets.allWallets = [];
    }
    if (action.type === 'auth/signUpSuccess') {
      state.auth.hasAccount = true;
    }
    if (action.type === 'wallets/createWallet') {
      const {phrase, privateKey} = action.data;
      if (failOn && (phrase === failOn || privateKey === failOn)) {
        return {unwrap: () => Promise.reject(new Error('network'))};
      }
      state.wallets.allWallets.push({
        clientId: `new-${state.wallets.allWallets.length}`,
        phrase,
        privateKey,
      });
      return {unwrap: () => Promise.resolve({})};
    }
    return action;
  };
  return {state, actions, dispatch};
};

describe('buildRestorePlan', () => {
  it('maps phrase and private-key wallets, skipping entries without keys', () => {
    expect(buildRestorePlan(OLD)).toEqual({
      plan: [
        {phrase: 'alpha words'},
        {privateKey: 'pk-b', chain_name: 'ethereum'},
      ],
      skipped: 1,
    });
  });

  it('prefers the chain_existing entry for a private-key wallet', () => {
    const {plan} = buildRestorePlan({
      wallets: {
        x: {
          privateKey: 'k',
          chainExisting: {binance_smart_chain: {privateKey: 'k'}},
          coins: {},
        },
      },
    });
    expect(plan).toEqual([
      {privateKey: 'k', chain_name: 'binance_smart_chain'},
    ]);
  });
});

describe('restoreFromVault', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecure.clear();
    mockSealed.clear();
    vault.unlockWithPassword.mockResolvedValue(OLD);
    vault.isUnlocked.mockReturnValue(true);
  });

  it('rebuilds every wallet with the vault locked, then writes them once', async () => {
    const store = makeStore();
    const result = await store.dispatch(restoreFromVault('old-pw'));

    expect(result).toEqual({wallets: 2, skipped: 1, via: 'rebuild'});
    expect(
      store.state.wallets.allWallets.map(w => w.phrase || w.privateKey),
    ).toEqual(['alpha words', 'pk-b']);
    // Read, locked for the rebuild, opened again only to write.
    expect(vault.unlockWithPassword).toHaveBeenCalledTimes(2);
    expect(vault.lock).toHaveBeenCalledTimes(1);
    expect(vault.saveSecrets).toHaveBeenCalledTimes(1);
    expect(vaultSync.reset).toHaveBeenCalled();
    expect(store.actions).toContain('auth/signUpSuccess');
    expect(store.actions).toContain('auth/logInSuccess');
    expect(store.actions).toContain('auth/vaultUnlocked');
    expect(markSealedSlicesLoaded).toHaveBeenCalled();
    expect(isRestoringFromVault()).toBe(false);
  });

  it('opens sealed writes for the rebuild only after the state key is set', async () => {
    const store = makeStore();
    await store.dispatch(restoreFromVault('old-pw'));
    expect(unsealStorage).toHaveBeenCalledTimes(1);
    expect(unsealStorage.mock.invocationCallOrder[0]).toBeLessThan(
      enableSealedWrites.mock.invocationCallOrder[0],
    );
    expect(sealStorage).not.toHaveBeenCalled();
  });

  it('unlocks normally when the sealed wallets are still on disk and match the vault', async () => {
    mockSealed.set(
      'persist:wallets',
      sealedEnvelope([{clientId: 'a'}, {clientId: 'b'}]),
    );
    const store = makeStore();
    const result = await store.dispatch(restoreFromVault('old-pw'));

    expect(result).toEqual({wallets: 2, skipped: 0, via: 'unlock'});
    expect(completeUnlock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      OLD,
      'restore',
    );
    expect(store.actions).not.toContain('wallets/createWallet');
    expect(vault.saveSecrets).not.toHaveBeenCalled();
    expect(store.actions).toContain('auth/signUpSuccess');
  });

  it('sets an unreadable sealed copy aside before rebuilding over it', async () => {
    mockSealed.set('persist:wallets', 'garbage');
    const store = makeStore();
    const result = await store.dispatch(restoreFromVault('old-pw'));
    expect(result.via).toBe('rebuild');
    const asideKey = [...mockSealed.keys()].find(key =>
      key.startsWith('persist:wallets.unreadable-'),
    );
    expect(mockSealed.get(asideKey)).toBe('garbage');
  });

  it('a sealed copy whose wallets have no keys in the vault is rebuilt, not unlocked', async () => {
    const raw = sealedEnvelope([{clientId: 'a'}, {clientId: 'zz'}]);
    mockSealed.set('persist:wallets', raw);
    const store = makeStore();
    const result = await store.dispatch(restoreFromVault('old-pw'));
    expect(result.via).toBe('rebuild');
    expect(completeUnlock).not.toHaveBeenCalled();
    expect(
      [...mockSealed.entries()].some(
        ([key, value]) =>
          key.startsWith('persist:wallets.unmatched-') && value === raw,
      ),
    ).toBe(true);
  });

  it('a failed normal unlock is reported as a failed restore', async () => {
    mockSealed.set('persist:wallets', sealedEnvelope([{clientId: 'a'}]));
    completeUnlock.mockRejectedValueOnce(new Error('missing secrets'));
    const store = makeStore();
    await expect(
      store.dispatch(restoreFromVault('old-pw')),
    ).rejects.toMatchObject({code: RESTORE_ERROR_CODES.FAILED});
    expect(store.state.auth.hasAccount).toBe(false);
    expect(releaseBlockedWrites).not.toHaveBeenCalled();
  });

  it('releases the blocked plain keys only once the restore succeeded', async () => {
    const store = makeStore();
    await store.dispatch(restoreFromVault('old-pw'));
    expect(releaseBlockedWrites.mock.calls.map(([key]) => key)).toEqual([
      'persist:auth',
      'persist:settings',
    ]);
    // Released before the account flag is set, so that write is not refused.
    expect(releaseBlockedWrites.mock.invocationCallOrder[1]).toBeLessThan(
      Math.max(...persistor.flush.mock.invocationCallOrder),
    );
  });

  it('a wrong password changes nothing', async () => {
    vault.unlockWithPassword.mockRejectedValueOnce(
      Object.assign(new Error('bad'), {code: 'invalid_password'}),
    );
    const store = makeStore();
    await expect(
      store.dispatch(restoreFromVault('nope')),
    ).rejects.toMatchObject({code: 'invalid_password'});
    expect(store.actions).toEqual([]);
    expect(vault.saveSecrets).not.toHaveBeenCalled();
  });

  it('one failed wallet undoes the restore, seals again and never writes the vault', async () => {
    const store = makeStore({failOn: 'pk-b'});
    await expect(
      store.dispatch(restoreFromVault('old-pw')),
    ).rejects.toMatchObject({code: RESTORE_ERROR_CODES.FAILED});
    expect(vault.saveSecrets).not.toHaveBeenCalled();
    expect(releaseBlockedWrites).not.toHaveBeenCalled();
    expect(store.state.wallets.allWallets).toEqual([]);
    expect(store.state.auth.hasAccount).toBe(false);
    expect(sealStorage).toHaveBeenCalled();
    // The emptied slice was flushed before the adapter was sealed.
    expect(Math.max(...persistor.flush.mock.invocationCallOrder)).toBeLessThan(
      sealStorage.mock.invocationCallOrder[0],
    );
    expect(markSealedSlicesLoaded).not.toHaveBeenCalled();
    expect(isRestoringFromVault()).toBe(false);
  });

  it('a cleanup failure still clears the restore flag and keeps the restore error', async () => {
    const store = makeStore({failOn: 'pk-b'});
    vault.lock
      .mockImplementationOnce(() => {}) // after the first read
      .mockImplementationOnce(() => {
        throw new Error('lock failed');
      });
    await expect(
      store.dispatch(restoreFromVault('old-pw')),
    ).rejects.toMatchObject({code: RESTORE_ERROR_CODES.FAILED});
    expect(isRestoringFromVault()).toBe(false);
    expect(sealStorage).toHaveBeenCalled();
    // The rebuilt wallets are still removed.
    expect(store.state.wallets.allWallets).toEqual([]);
  });

  it('a failed vault rewrite puts the old keys back', async () => {
    vault.saveSecrets
      .mockRejectedValueOnce(new Error('idb'))
      .mockResolvedValueOnce();
    const store = makeStore();
    await expect(
      store.dispatch(restoreFromVault('old-pw')),
    ).rejects.toMatchObject({code: RESTORE_ERROR_CODES.FAILED});
    expect(vault.saveSecrets).toHaveBeenLastCalledWith(OLD);
    expect(store.state.auth.hasAccount).toBe(false);
  });

  it('a vault with no usable keys reports nothing to restore', async () => {
    vault.unlockWithPassword.mockResolvedValue({v: 1, wallets: {c: {}}});
    const store = makeStore();
    await expect(
      store.dispatch(restoreFromVault('old-pw')),
    ).rejects.toMatchObject({code: RESTORE_ERROR_CODES.NOTHING_TO_RESTORE});
    expect(vault.lock).toHaveBeenCalled();
  });

  it('refuses while an account exists', async () => {
    const store = makeStore();
    store.state.auth.hasAccount = true;
    await expect(
      store.dispatch(restoreFromVault('old-pw')),
    ).rejects.toMatchObject({code: 'account_exists'});
    expect(vault.unlockWithPassword).not.toHaveBeenCalled();
  });
});

// Wrong passwords are slowed down with a counter kept in the secure store
// (it outlives the state database). The vault itself is never destroyed.
describe('restore password attempts', () => {
  const wrong = () =>
    vault.unlockWithPassword.mockRejectedValueOnce(
      Object.assign(new Error('bad'), {code: 'invalid_password'}),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecure.clear();
    mockSealed.clear();
    vault.unlockWithPassword.mockResolvedValue(OLD);
  });

  it('waits 30 s after the fifth wrong password, doubling up to an hour', () => {
    expect(restoreDelayMs(RESTORE_FREE_ATTEMPTS - 1)).toBe(0);
    expect(restoreDelayMs(RESTORE_FREE_ATTEMPTS)).toBe(30000);
    expect(restoreDelayMs(RESTORE_FREE_ATTEMPTS + 1)).toBe(60000);
    expect(restoreDelayMs(50)).toBe(60 * 60 * 1000);
  });

  it('locks out after five wrong passwords without trying the vault', async () => {
    const store = makeStore();
    for (let i = 0; i < RESTORE_FREE_ATTEMPTS; i++) {
      wrong();
      await expect(store.dispatch(restoreFromVault('x'))).rejects.toMatchObject(
        {code: 'invalid_password'},
      );
    }
    vault.unlockWithPassword.mockClear();
    await expect(
      store.dispatch(restoreFromVault('old-pw')),
    ).rejects.toMatchObject({code: RESTORE_ERROR_CODES.TOO_MANY_ATTEMPTS});
    expect(vault.unlockWithPassword).not.toHaveBeenCalled();
    expect(mockSecure.get(RESTORE_ATTEMPT_KEYS.failures)).toBe('5');
  });

  it('a right password clears the counter', async () => {
    wrong();
    const store = makeStore();
    await expect(store.dispatch(restoreFromVault('x'))).rejects.toBeTruthy();
    await store.dispatch(restoreFromVault('old-pw'));
    expect(mockSecure.has(RESTORE_ATTEMPT_KEYS.failures)).toBe(false);
  });
});
