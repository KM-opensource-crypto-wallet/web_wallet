// "Restore wallets from this device", web edition: the account flag is gone
// (an emptied state database, an unreadable `persist:auth`) but the vault
// still holds the wallets' keys. The old password opens it.
//
// Two paths, decided after the vault opened:
//   unlock   the sealed `persist:wallets` copy is still on disk, decrypts
//            under the vault's state key and every wallet in it has its keys
//            in the vault: the normal unlock (completeUnlock) brings it all
//            back, names, coins and history included.
//   rebuild  that copy is missing, unreadable or does not match the vault:
//            the wallets are recreated from the vault's phrases / private
//            keys, as on mobile. An unreadable copy is set aside first, never
//            overwritten.
//
// On the rebuild path the vault is never written until every wallet is back:
// the keys are read, the vault is locked again (vaultSync skips writes while
// locked), the wallets are recreated, and only when each recovered key is
// found in the new wallets is the vault rewritten and the account marked as
// existing. Any failure removes the rebuilt wallets and leaves the old vault
// exactly as it was, so the restore can be retried.
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {VAULT_ERROR_CODES} from 'dok-wallet-blockchain-networks/security/errors';
import * as secureStore from 'security/secureStore';
import {
  createIfNotExistsMasterClientId,
  createWallet,
  reassignCurrentWalletIfHidden,
  resetCoinsToDefaultAddressForPrivacyMode,
  resetWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  logInSuccess,
  signUpSuccess,
  vaultUnlocked,
} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {getHasAccount} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {extractVaultPayload} from 'dok-wallet-blockchain-networks/redux/wallets/walletSecrets';
import {parsePersistEnvelope} from 'dok-wallet-blockchain-networks/redux/storage/legacyRootMigration';
import {addBreadcrumb, captureError, logger} from 'services/logger';
import {persistor, vaultSync} from 'redux/store';
import {releaseBlockedWrites} from 'redux/storage/plainStorage';
import {
  enableSealedWrites,
  readSealed,
  sealStorage,
  unsealStorage,
} from 'redux/storage/sealedStorage';
import {sealedKv} from 'redux/storage/stateDb';
import {
  AccountExistsError,
  completeUnlock,
  markSealedSlicesLoaded,
} from './unlockFlow';
import {setRestoringFromVault} from './restoreState';

// The plain slices a restore may find blocked (see store.js guardFailedRehydrate).
const RESTORED_PERSIST_KEYS = ['persist:auth', 'persist:settings'];
const SEALED_WALLETS_KEY = 'persist:wallets';

export const RESTORE_ERROR_CODES = Object.freeze({
  NOTHING_TO_RESTORE: 'restore_nothing',
  FAILED: 'restore_failed',
  TOO_MANY_ATTEMPTS: 'restore_too_many_attempts',
});

// Wrong passwords on the restore page. Kept in the secure store next to the
// vault (the `dok-secure` database), so losing the state database does not
// reset it. Never destroys the vault: that is the loss this page exists to
// prevent; guessing is slowed down instead.
export const RESTORE_ATTEMPT_KEYS = Object.freeze({
  failures: 'restore.failures',
  lockedUntil: 'restore.lockedUntil',
});
export const RESTORE_FREE_ATTEMPTS = 5;
const RESTORE_BASE_DELAY_MS = 30 * 1000;
const RESTORE_MAX_DELAY_MS = 60 * 60 * 1000;

/** Wait after `failures` wrong passwords: none for the first five, then 30 s doubling to 1 h. */
export const restoreDelayMs = failures =>
  failures < RESTORE_FREE_ATTEMPTS
    ? 0
    : Math.min(
        RESTORE_BASE_DELAY_MS * 2 ** (failures - RESTORE_FREE_ATTEMPTS),
        RESTORE_MAX_DELAY_MS,
      );

export class TooManyAttemptsError extends Error {
  constructor(retryInMs) {
    const minutes = Math.max(1, Math.ceil(retryInMs / 60000));
    super(
      `Too many wrong passwords. Try again in ${minutes} minute${
        minutes === 1 ? '' : 's'
      }.`,
    );
    this.name = 'TooManyAttemptsError';
    this.code = RESTORE_ERROR_CODES.TOO_MANY_ATTEMPTS;
    this.retryInMs = retryInMs;
  }
}

const readNumber = async key => Number((await secureStore.get(key)) || 0) || 0;

const assertNotLockedOut = async now => {
  const lockedUntil = await readNumber(RESTORE_ATTEMPT_KEYS.lockedUntil);
  if (lockedUntil > now) {
    throw new TooManyAttemptsError(lockedUntil - now);
  }
};

const recordWrongPassword = async now => {
  const failures = (await readNumber(RESTORE_ATTEMPT_KEYS.failures)) + 1;
  await secureStore.set(RESTORE_ATTEMPT_KEYS.failures, String(failures));
  const delay = restoreDelayMs(failures);
  if (delay) {
    await secureStore.set(
      RESTORE_ATTEMPT_KEYS.lockedUntil,
      String(now + delay),
    );
  }
  logger.warn('vault.restore_wrong_password', {failures});
};

const clearAttempts = async () => {
  await secureStore.remove(RESTORE_ATTEMPT_KEYS.failures);
  await secureStore.remove(RESTORE_ATTEMPT_KEYS.lockedUntil);
};

export class NothingToRestoreError extends Error {
  constructor() {
    super('No wallets were found in the saved keys on this device.');
    this.name = 'NothingToRestoreError';
    this.code = RESTORE_ERROR_CODES.NOTHING_TO_RESTORE;
  }
}

export class RestoreFailedError extends Error {
  constructor(cause) {
    super(
      'Your wallets could not be restored. Nothing was changed; check your internet connection and try again.',
    );
    this.name = 'RestoreFailedError';
    this.code = RESTORE_ERROR_CODES.FAILED;
    this.cause = cause;
  }
}

/** Whether onboarding should offer the restore: keys saved, no account. */
export const canRestoreFromVault = () => async (dispatch, getState) =>
  !getHasAccount(getState()) && vault.hasVault();

// The chain of a private-key wallet: the chain_existing entry or coin whose
// key is the wallet's own (coin keys are `<chain_name>_<SYMBOL>`).
const chainOfPrivateKey = entry => {
  for (const [chain, value] of Object.entries(entry.chainExisting || {})) {
    if (value?.privateKey === entry.privateKey) {
      return chain;
    }
  }
  for (const [coinKey, value] of Object.entries(entry.coins || {})) {
    if (value?.privateKey === entry.privateKey) {
      return coinKey.slice(0, coinKey.lastIndexOf('_'));
    }
  }
  return null;
};

/**
 * One import per vault wallet, in the original order: `{phrase}` for a
 * recovery-phrase wallet, `{privateKey, chain_name}` for a private-key one.
 * Entries with neither (nothing to sign with) are counted as skipped.
 */
export const buildRestorePlan = payload => {
  const plan = [];
  let skipped = 0;
  for (const entry of Object.values(payload?.wallets || {})) {
    if (entry?.phrase) {
      plan.push({phrase: entry.phrase});
      continue;
    }
    const chain_name = entry?.privateKey ? chainOfPrivateKey(entry) : null;
    if (chain_name) {
      plan.push({privateKey: entry.privateKey, chain_name});
    } else {
      skipped += 1;
    }
  }
  return {plan, skipped};
};

// Every recovered phrase / private key must be in the rebuilt wallets before
// the vault is rewritten with them.
const findMissingAfterRestore = (plan, payload) => {
  const entries = Object.values(payload?.wallets || {});
  return plan.filter(item =>
    item.phrase
      ? !entries.some(entry => entry?.phrase === item.phrase)
      : !entries.some(entry => entry?.privateKey === item.privateKey),
  ).length;
};

const entryHasKeys = entry =>
  Boolean(entry?.phrase) ||
  Boolean(entry?.privateKey) ||
  Object.values(entry?.coins || {}).some(
    coin => coin?.privateKey || coin?.extendedPrivateKey,
  );

/**
 * The sealed wallets copy, read with the vault's state key:
 *   {status: 'missing'}                 nothing on disk
 *   {status: 'unreadable', raw}         does not decrypt or parse
 *   {status: 'unmatched', raw}          readable, but empty or a wallet in it
 *                                       has no keys in the vault
 *   {status: 'usable', count}           the normal unlock restores it
 */
export const inspectSealedWallets = async (stateKey, payload) => {
  const raw = await sealedKv.get(SEALED_WALLETS_KEY);
  if (raw == null) {
    return {status: 'missing'};
  }
  let allWallets;
  try {
    const text = await readSealed(SEALED_WALLETS_KEY, stateKey);
    allWallets = parsePersistEnvelope(text)?.allWallets;
  } catch {
    return {status: 'unreadable', raw};
  }
  const wallets = Array.isArray(allWallets) ? allWallets : [];
  const usable =
    wallets.length > 0 &&
    wallets.every(w => entryHasKeys(payload?.wallets?.[w?.clientId]));
  return usable
    ? {status: 'usable', count: wallets.length}
    : {status: 'unmatched', raw};
};

// Kept, never deleted: the rebuild writes a new copy under the live key.
const setAsideSealedWallets = async (raw, status) => {
  const key = `${SEALED_WALLETS_KEY}.${status}-${Date.now()}`;
  await sealedKv.set(key, raw);
  logger.error('storage.sealed_wallets_set_aside', {status});
};

// resetWallet also drops the master client id, which the unlock flow
// normally creates; it must exist before the first wallet is created.
const clearWallets = async dispatch => {
  dispatch(resetWallet());
  await dispatch(createIfNotExistsMasterClientId());
};

const restoreByUnlock = async (dispatch, getState, payload) => {
  try {
    await completeUnlock(dispatch, getState, payload, 'restore');
  } catch (error) {
    // completeUnlock already rolled the session back (vault locked).
    captureError(error, {tags: {area: 'vault', op: 'restore_from_vault'}});
    throw new RestoreFailedError(error);
  }
};

const restoreByRebuild = async (dispatch, getState, password, payload) => {
  const {plan, skipped} = buildRestorePlan(payload);
  if (!plan.length) {
    vault.lock();
    throw new NothingToRestoreError();
  }
  const stateKey = await vault.getStateKey();
  vault.lock();
  vaultSync.reset();
  setRestoringFromVault(true);
  // Unlike mobile, the sealed adapter needs the key for the rebuilt wallets to
  // be persisted at all. The vault itself stays locked until they are verified.
  unsealStorage(stateKey);
  enableSealedWrites();
  let saving = false;
  try {
    await clearWallets(dispatch);
    for (const [index, item] of plan.entries()) {
      await dispatch(
        createWallet({walletName: `Restored wallet ${index + 1}`, ...item}),
      ).unwrap();
    }
    const rebuilt = extractVaultPayload(getState().wallets?.allWallets);
    if (findMissingAfterRestore(plan, rebuilt)) {
      throw new Error('A restored wallet is missing its key');
    }
    // Drop any debounced snapshot first: once the vault is open again only
    // the verified, complete payload may be written.
    vaultSync.reset();
    await vault.unlockWithPassword(password);
    saving = true;
    await vault.saveSecrets(rebuilt);
    vaultSync.markSynced(rebuilt);
  } catch (error) {
    if (saving && vault.isUnlocked()) {
      // The rewrite failed part way: put the keys that were read back, so the
      // vault never ends up holding less than before the restore.
      await vault.saveSecrets(payload).catch(writeError =>
        captureError(writeError, {
          tags: {area: 'vault', op: 'restore_rollback'},
        }),
      );
    }
    // Cleanup must not replace the restore error or leave the flag set.
    try {
      try {
        vault.lock();
      } finally {
        // The emptied wallets slice must land before the adapter is sealed,
        // or the half-rebuilt copy would stay on disk.
        await clearWallets(dispatch);
        await persistor.flush();
      }
    } catch (cleanupError) {
      captureError(cleanupError, {
        tags: {area: 'vault', op: 'restore_cleanup'},
      });
    } finally {
      sealStorage();
      setRestoringFromVault(false);
    }
    captureError(error, {tags: {area: 'vault', op: 'restore_from_vault'}});
    throw new RestoreFailedError(error);
  }
  setRestoringFromVault(false);
  markSealedSlicesLoaded();
  dispatch(resetCoinsToDefaultAddressForPrivacyMode());
  dispatch(reassignCurrentWalletIfHidden());
  dispatch(vaultUnlocked());
  return {wallets: plan.length, skipped};
};

export const restoreFromVault = password => async (dispatch, getState) => {
  if (getHasAccount(getState())) {
    throw new AccountExistsError();
  }
  const now = Date.now();
  await assertNotLockedOut(now);
  // Throws INVALID_PASSWORD for a wrong password; nothing else changes.
  let payload;
  try {
    payload = await vault.unlockWithPassword(password);
  } catch (error) {
    if (error?.code === VAULT_ERROR_CODES.INVALID_PASSWORD) {
      await recordWrongPassword(now);
    }
    throw error;
  }
  await clearAttempts();

  let sealed;
  try {
    sealed = await inspectSealedWallets(await vault.getStateKey(), payload);
  } catch (error) {
    vault.lock();
    throw error;
  }
  let counts;
  if (sealed.status === 'usable') {
    await restoreByUnlock(dispatch, getState, payload);
    counts = {wallets: sealed.count, skipped: 0, via: 'unlock'};
  } else {
    if (sealed.status !== 'missing') {
      try {
        await setAsideSealedWallets(sealed.raw, sealed.status);
      } catch (error) {
        vault.lock();
        throw error;
      }
    }
    counts = {
      ...(await restoreByRebuild(dispatch, getState, password, payload)),
      via: 'rebuild',
    };
  }

  // A plain slice whose stored copy failed to load keeps it until now; the
  // restore succeeded, so the live state replaces it. Drain the queued writes
  // first so the newest value is the one released.
  await persistor.flush();
  for (const key of RESTORED_PERSIST_KEYS) {
    await releaseBlockedWrites(key);
  }

  dispatch(signUpSuccess());
  dispatch(logInSuccess());
  await persistor.flush();
  addBreadcrumb('auth', 'vault.restored', counts);
  logger.info('vault.restored', counts);
  return counts;
};
