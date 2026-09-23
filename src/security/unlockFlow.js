// Login / registration orchestration on top of the vault, web edition. Thunks,
// so pages `await dispatch(unlockWithPassword(pw))` and branch on the thrown
// error code.
//
// Unlock order matters (spec §3.1 and §12.3.4):
//   1. vault.unlockWithPassword → DEK; derive the state key
//   2. unsealStorage(stateKey): the sealed adapter may now READ
//   3. for each sealed slice: getStoredState(config) + persist/REHYDRATE
//      (redux-persist has no "already rehydrated" guard, so a second
//      rehydrate simply runs the normal reconciler)
//   4. hydrateWalletSecrets(payload); refuse wallets that still have no key
//   5. enableSealedWrites(): only now may the persistoid write, otherwise the
//      initial state that PersistGate opened with would overwrite real data
//   6. mark the session unlocked; post-load wallet thunks; finalise migration
import {REHYDRATE, getStoredState} from 'redux-persist';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {VAULT_ERROR_CODES} from 'dok-wallet-blockchain-networks/security/errors';
import {
  clearWalletSecrets,
  createIfNotExistsMasterClientId,
  hydrateWalletSecrets,
  reassignCurrentWalletIfHidden,
  resetCoinsToDefaultAddressForPrivacyMode,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  vaultLocked,
  vaultUnlocked,
} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {getHasAccount} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {addBreadcrumb, captureError} from 'services/logger';
import {SEALED_PERSIST_CONFIGS, persistor, vaultSync} from 'redux/store';
import {
  enableSealedWrites,
  isSealedWritable,
  sealStorage,
  unsealStorage,
} from 'redux/storage/sealedStorage';
import {
  commitOrphanLegacyMigration,
  consumeOrphanLegacyState,
  finalizeLegacyMigration,
} from 'redux/storage/migrateLegacyRoot';

export const UNLOCK_ERROR_CODES = Object.freeze({
  ...VAULT_ERROR_CODES,
  MISSING_SECRETS: 'missing_secrets',
  ACCOUNT_EXISTS: 'account_exists',
});

export class AccountExistsError extends Error {
  constructor() {
    super('An account already exists on this device. Log in instead.');
    this.name = 'AccountExistsError';
    this.code = UNLOCK_ERROR_CODES.ACCOUNT_EXISTS;
  }
}

export class MissingSecretsError extends Error {
  constructor(clientIds) {
    super(
      `${clientIds.length} wallet(s) have no keys in the vault. Restore them from their seed phrase.`,
    );
    this.name = 'MissingSecretsError';
    this.code = UNLOCK_ERROR_CODES.MISSING_SECRETS;
    this.clientIds = clientIds;
  }
}

const hasAnyKey = wallet =>
  Boolean(wallet?.phrase) ||
  Boolean(wallet?.privateKey) ||
  (wallet?.coins || []).some(
    coin => coin?.privateKey || coin?.extendedPrivateKey,
  );

export const findWalletsWithoutKeys = allWallets =>
  (allWallets || [])
    .filter(w => w?.clientId && !hasAnyKey(w))
    .map(w => w.clientId);

// Once per page load: after that the in-memory slices are the freshest copy
// (an idle-lock re-login must not roll them back to the throttled disk copy).
let sealedRehydrated = false;

const rehydrateSealedSlices = async dispatch => {
  for (const [name, config] of Object.entries(SEALED_PERSIST_CONFIGS)) {
    const payload = await getStoredState(config);
    dispatch({type: REHYDRATE, key: name, payload, err: undefined});
  }
};

// Legacy state migrated without a password (nothing could be sealed): feed
// the sanitized slices in from memory so Registration → createAccount can
// persist them.
const rehydrateOrphanLegacyState = (dispatch, orphan) => {
  for (const [name, slice] of Object.entries(orphan.slices)) {
    dispatch({type: REHYDRATE, key: name, payload: slice, err: undefined});
  }
  dispatch(hydrateWalletSecrets(orphan.vaultPayload));
};

const runPostUnlockThunks = dispatch => {
  dispatch(createIfNotExistsMasterClientId());
  dispatch(resetCoinsToDefaultAddressForPrivacyMode());
  dispatch(reassignCurrentWalletIfHidden());
};

// A failed unlock must not leave a half-open session behind (keys hydrated
// into the store, the sealed adapter readable, the vault holding the DEK)
// while the UI still shows the lock screen. The rehydrated non-secret slices
// stay in memory; only the secrets and the key handles are rolled back.
const rollbackUnlock = dispatch => {
  try {
    dispatch(clearWalletSecrets());
  } finally {
    sealStorage();
    vault.lock();
    dispatch(vaultLocked());
  }
};

const completeUnlock = async (dispatch, getState, payload, via) => {
  try {
    unsealStorage(await vault.getStateKey());
    if (!sealedRehydrated) {
      await rehydrateSealedSlices(dispatch);
      sealedRehydrated = true;
    }
    dispatch(hydrateWalletSecrets(payload));
    const missing = findWalletsWithoutKeys(getState().wallets?.allWallets);
    if (missing.length) {
      captureError(new Error('Wallets without secrets after unlock'), {
        tags: {area: 'vault', op: 'missing_secrets'},
        extra: {count: missing.length, via},
      });
      throw new MissingSecretsError(missing);
    }
  } catch (error) {
    rollbackUnlock(dispatch);
    throw error;
  }
  vaultSync.markSynced(payload);
  enableSealedWrites();
  dispatch(vaultUnlocked());
  addBreadcrumb('auth', 'vault.unlocked', {via});
  runPostUnlockThunks(dispatch);
  try {
    await finalizeLegacyMigration({getState});
  } catch (error) {
    captureError(error, {
      tags: {area: 'storage', op: 'migrate', step: 'finalize'},
    });
  }
};

export const unlockWithPassword = password => async (dispatch, getState) => {
  const payload = await vault.unlockWithPassword(password);
  await completeUnlock(dispatch, getState, payload, 'password');
  // The vault re-wraps a stale KDF envelope during a password unlock but never
  // fails the unlock over it; if the write did not stick, say so here.
  if (await vault.needsKdfUpgrade().catch(() => false)) {
    captureError(new Error('KDF parameter upgrade did not persist'), {
      level: 'warning',
      tags: {area: 'vault', op: 'kdf_upgrade'},
    });
  }
};

/**
 * Registration: create the vault for a new account. Refused while an account
 * exists: an existing vault is only ever replaced through the explicit reset
 * flow (wipeAllLocalData). The one vault this replaces is a leftover from a
 * wipe whose destroy step failed, where no account remains. Sealed writes
 * open straight away (there is nothing on disk to rehydrate). Orphaned legacy
 * state, if any, is fed in so the listener and persistoid store it under the
 * new key; the migration's schemaVersion is only advanced once both have been
 * flushed to disk, so a reload before that point redoes the migration from
 * the legacy blob.
 */
export const createAccount = password => async (dispatch, getState) => {
  if (getHasAccount(getState())) {
    throw new AccountExistsError();
  }
  if (await vault.hasVault()) {
    await vault.destroy();
  }
  await vault.createVault(password);
  unsealStorage(await vault.getStateKey());
  sealedRehydrated = true;
  const orphan = consumeOrphanLegacyState();
  if (orphan) {
    // reset() first: it also drops any pending snapshot, so calling it after
    // the hydrate would throw away the very write flush() is meant to land.
    vaultSync.reset();
    rehydrateOrphanLegacyState(dispatch, orphan);
  }
  enableSealedWrites();
  dispatch(vaultUnlocked());
  addBreadcrumb('auth', 'vault.created', {});
  // Same post-unlock initialisation as a login: the master client id must
  // exist before the first wallet is created (registerUserAPI, logging user
  // context), and orphaned legacy wallets need the privacy-mode / hidden
  // wallet housekeeping that runs on every unlock.
  runPostUnlockThunks(dispatch);
  if (orphan) {
    await vaultSync.flush();
    await persistor.flush();
    await commitOrphanLegacyMigration();
  }
};

/**
 * Zeroise on lock (Phase 5). Idle lock and logout route to /auth/login; before
 * that, drop every secret from memory: the DEK and state key in the vault,
 * the sealed adapter's key (writes pause until re-login), and the mnemonics /
 * private keys on the in-memory wallets. Non-secret state stays so the page
 * can still render behind the lock; re-login hydrates the secrets back.
 */
export const lockSession = () => async dispatch => {
  await vaultSync.flush().catch(() => {});
  dispatch(clearWalletSecrets());
  sealStorage();
  vault.lock();
  dispatch(vaultLocked());
  addBreadcrumb('auth', 'vault.locked', {});
};

export const isInvalidPassword = error =>
  error?.code === VAULT_ERROR_CODES.INVALID_PASSWORD;

export const isUnlockedForWrites = () =>
  vault.isUnlocked() && isSealedWritable();

// Test hook only.
export const __resetUnlockFlowForTests = () => {
  sealedRehydrated = false;
};
