// @override-of src/security/unlockFlow.js sha256:8edce940e552a2c1136e2ba7a29cc574bc5a9920972729b4be7fe33f1b48683d
//
// Extension copy of the web unlock flow. Differences from upstream, all marked
// "[ext]":
//   - unlockWithSession(): unlock from the session-held DEK (no password),
//     through the same completeUnlock as a password login.
//   - after a password unlock / account creation the DEK is kept for the
//     session (rememberSession), unless auto-lock is "on reload" (0).
//   - lockSession() also drops the session DEK, which locks every other open
//     extension page too.
// Re-merge when `yarn ext:check` reports upstream changes.
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
import {addBreadcrumb, captureError, logger} from 'services/logger';
import {SEALED_PERSIST_CONFIGS, vaultSync} from 'redux/store';
import {
  enableSealedWrites,
  isSealedWritable,
  listSealedKeys,
  sealStorage,
  sealedStorage,
  unsealStorage,
} from 'redux/storage/sealedStorage';
import {getLockTime} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  broadcastLock,
  setSessionLockTime,
  touchSession,
} from '@ext/extension/session';
import {
  commitOrphanLegacyMigration,
  consumeOrphanLegacyState,
  finalizeLegacyMigration,
  peekOrphanLegacyState,
} from 'redux/storage/migrateLegacyRoot';

export const UNLOCK_ERROR_CODES = Object.freeze({
  ...VAULT_ERROR_CODES,
  MISSING_SECRETS: 'missing_secrets',
  ACCOUNT_EXISTS: 'account_exists',
  VAULT_EXISTS: 'vault_exists',
});

export class AccountExistsError extends Error {
  constructor() {
    super('An account already exists on this device. Log in instead.');
    this.name = 'AccountExistsError';
    this.code = UNLOCK_ERROR_CODES.ACCOUNT_EXISTS;
  }
}

// Registration found a vault from earlier on this device: its wallets can still
// be restored with the old password, so it is only replaced once the user has
// chosen to start over (`discardExistingVault`).
export class VaultExistsError extends Error {
  constructor() {
    super(
      'Wallets from earlier are still saved on this device. Restore them with your old password, or delete them to start over.',
    );
    this.name = 'VaultExistsError';
    this.code = UNLOCK_ERROR_CODES.VAULT_EXISTS;
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

// The vault this page created for an orphan commit that then failed: it holds
// nothing but that attempt, so the next Registration submit may replace it.
// Any other existing vault is replaced only when the user starts over.
let failedOrphanVault = false;

const rehydrateSealedSlices = async dispatch => {
  for (const [name, config] of Object.entries(SEALED_PERSIST_CONFIGS)) {
    const payload = await getStoredState(config);
    dispatch({type: REHYDRATE, key: name, payload, err: undefined});
  }
};

// Legacy state migrated without a password, already sealed on disk by
// commitOrphanLegacyMigration: feed the same sanitized slices and secrets
// into the store from memory.
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

// Also the restore fast path (vaultRecovery): a vault without an account whose
// sealed wallets are still on disk is unlocked exactly like a login.
export const completeUnlock = async (dispatch, getState, payload, via) => {
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

// [ext] Keep the DEK for this browser session (src/extension/session.js).
// Losing it is harmless: the next page just asks for the password.
export const rememberSession = async getState => {
  const lockTime = getLockTime(getState());
  await setSessionLockTime(lockTime);
  if (!(lockTime > 0)) {
    await vault.disableBiometric().catch(() => {});
    return;
  }
  try {
    await touchSession();
    await vault.enableBiometric();
  } catch (error) {
    captureError(error, {
      level: 'warning',
      tags: {area: 'vault', op: 'session_remember'},
    });
  }
};

export const unlockWithPassword = password => async (dispatch, getState) => {
  const payload = await vault.unlockWithPassword(password);
  await completeUnlock(dispatch, getState, payload, 'password');
  await rememberSession(getState); // [ext]
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
 * [ext] Unlock from the DEK kept for this browser session. Throws (and leaves
 * the vault locked) when there is none; the caller then shows the password
 * form.
 */
export const unlockWithSession = () => async (dispatch, getState) => {
  const payload = await vault.unlockWithBiometric();
  await completeUnlock(dispatch, getState, payload, 'session');
};

/**
 * Registration: create the vault for a new account. Refused while an account
 * exists: an existing vault is only ever replaced through the explicit reset
 * flow (wipeAllLocalData). A vault found without an account (a state database
 * that came back empty, an unreadable auth slice, or a wipe whose destroy step
 * failed) still holds wallet keys: it is refused with VaultExistsError until
 * the user picks Restore (vaultRecovery) or confirms starting over
 * (`discardExistingVault`). Sealed writes open straight away (there is nothing
 * on disk to rehydrate).
 *
 * Orphaned legacy state (migrated without a password) is sealed, verified and
 * committed (schemaVersion 0 → 2) BEFORE the store sees it, with awaited
 * writes: redux-persist swallows a failed sealed write, so its flush cannot
 * prove anything landed. The parked state is released only after the commit;
 * a failure locks the new vault again, leaves the store untouched and keeps
 * the state parked, so the next Registration submit on this page retries all
 * of it. After a reload, the vault from the failed attempt can't be told apart
 * from a vault holding other wallets, so it is refused like any existing vault
 * (VaultExistsError) until the user picks Restore or starts over.
 */
export const createAccount =
  (password, {discardExistingVault = false} = {}) =>
  async (dispatch, getState) => {
    if (getHasAccount(getState())) {
      throw new AccountExistsError();
    }
    if (await vault.hasVault()) {
      // A parked orphan proves nothing about this vault: it may hold wallets
      // created after an earlier migration. Only the user's start-over, or the
      // retry of this page's own failed orphan commit, replaces it.
      if (!discardExistingVault && !failedOrphanVault) {
        throw new VaultExistsError();
      }
      addBreadcrumb('auth', 'vault.discarded', {by: 'registration'}, 'warning');
      logger.warn('vault.discarded', {by: 'registration'});
      await vault.destroy();
      failedOrphanVault = false;
      if (discardExistingVault) {
        // Sealed slices under the destroyed vault's key can never be read
        // again, and a later unlock would fail on them: the user chose to
        // delete them. (The orphan path rewrites them under the new key.)
        for (const key of await listSealedKeys()) {
          await sealedStorage.removeItem(key);
        }
      }
    }
    await vault.createVault(password);
    const stateKey = await vault.getStateKey();
    // Peek, never consume here: consuming before the commit landed would make a
    // retry find nothing to migrate and leave the wallets without keys.
    const orphan = peekOrphanLegacyState();
    if (orphan) {
      try {
        await commitOrphanLegacyMigration(stateKey);
      } catch (error) {
        failedOrphanVault = true;
        vault.lock();
        throw error;
      }
    }
    unsealStorage(stateKey);
    sealedRehydrated = true;
    if (orphan) {
      // reset() first: it also drops any pending snapshot. The vault already
      // holds exactly this payload, so the hydrate's write is skipped.
      vaultSync.reset();
      rehydrateOrphanLegacyState(dispatch, orphan);
      vaultSync.markSynced(orphan.vaultPayload);
      consumeOrphanLegacyState();
    }
    enableSealedWrites();
    dispatch(vaultUnlocked());
    addBreadcrumb('auth', 'vault.created', {});
    // Same post-unlock initialisation as a login: the master client id must
    // exist before the first wallet is created (registerUserAPI, logging user
    // context), and orphaned legacy wallets need the privacy-mode / hidden
    // wallet housekeeping that runs on every unlock.
    runPostUnlockThunks(dispatch);
    await rememberSession(getState); // [ext]
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
  await vault.disableBiometric().catch(() => {}); // [ext]
  dispatch(vaultLocked());
  broadcastLock(); // [ext]
  addBreadcrumb('auth', 'vault.locked', {});
};

export const isInvalidPassword = error =>
  error?.code === VAULT_ERROR_CODES.INVALID_PASSWORD;

export const isUnlockedForWrites = () =>
  vault.isUnlocked() && isSealedWritable();

/** vaultRecovery rebuilt the wallets in memory: the sealed slices count as loaded. */
export const markSealedSlicesLoaded = () => {
  sealedRehydrated = true;
};

// Test hook only.
export const __resetUnlockFlowForTests = () => {
  sealedRehydrated = false;
  failedOrphanVault = false;
};
