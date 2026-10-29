// One-time migration of the legacy web blob — `localStorage['persist:root']`,
// one crypto-js AES ciphertext per slice keyed by the build-time REDUX_WEB_KEY
// (redux-persist-transform-encrypt) — into IndexedDB plain/sealed slices plus
// the vault.
//
// On-disk shape: redux-persist's createPersistoid serialises every transformed
// field (`stagedState[key] = serialize(endState)`) and then the root, so each
// field is a JSON string literal *of* the ciphertext:
//   {"auth":"\"U2FsdGVkX1...\"","_persist":"\"U2FsdGVkX1...\"",...}
// getStoredState deserialises the field before the transform's `out`;
// decodeLegacyValue must do the same or crypto-js decrypts the quoted string
// (base64 misaligned, no "Salted__" header → random salt → garbage/empty).
//
// State machine on `storage.schemaVersion` in the plain store (spec §5.2):
//   0 legacy    → migrate; schemaVersion=2 is the LAST write, so a reload
//                 anywhere before it redoes cleanly from the untouched blob
//   2 migrated  → new stores written, legacy retained
//   3 finalized → legacy removed after the first successful unlock
//
// Legacy wallets without a password cannot be sealed during the bootstrap.
// They are parked in memory (orphanLegacyState) and the version stays at 0
// until Registration has created the vault and commitOrphanLegacyMigration
// has sealed and verified them under its key (unlockFlow.createAccount).
// Writing 2 any earlier would make a reload skip the migration and lose those
// wallets.
import Aes from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import * as vault from 'dok-wallet-blockchain-networks/security/vault';
import {
  buildPersistEnvelope,
  parseLegacyRoot,
  parsePersistEnvelope,
  splitLegacyRoot,
  verifyMigration,
} from 'dok-wallet-blockchain-networks/redux/storage/legacyRootMigration';
import {addBreadcrumb, captureError, logger} from 'services/logger';
import {SCHEMA_VERSION, STORAGE_KEYS} from './bootstrap';
import {plainKv} from './stateDb';
import {readSealed, writeSealed} from './sealedStorage';
import {LEGACY_ROOT_KEY, removeLegacyRootBlob} from './wipe';

export const MIGRATION_ERROR_CODES = Object.freeze({
  PARSE: 'migrate_parse',
  DECRYPT: 'migrate_decrypt',
  VERIFY: 'migrate_verify',
});

// Which slices go where. Kept here (not imported from redux/store) so the
// migrator can run inside the storage bootstrap, before the store exists.
export const PLAIN_SLICES = Object.freeze(['auth', 'settings']);
export const SEALED_SLICES = Object.freeze([
  'wallets',
  'sellCrypto',
  'batchTransaction',
  'customRpc',
  'sentAddressHistory',
]);

const migrationError = (code, message, cause) =>
  Object.assign(new Error(message), {code, cause});

// Slice name only; the data itself never leaves the device.
const sliceError = (code, sliceName, message, cause) =>
  Object.assign(migrationError(code, message, cause), {slice: sliceName});

// Legacy wallets found next to an empty password: nothing can be sealed yet.
// Their sanitized slices and secrets stay in memory for this session and are
// sealed once Registration creates a vault (unlockFlow.createAccount →
// commitOrphanLegacyMigration).
let orphanLegacyState = null;
/** Read without clearing: createAccount consumes only after the commit. */
export const peekOrphanLegacyState = () => orphanLegacyState;
export const consumeOrphanLegacyState = () => {
  const state = orphanLegacyState;
  orphanLegacyState = null;
  return state;
};

export const readLegacyRoot = () =>
  typeof localStorage === 'undefined'
    ? null
    : localStorage.getItem(LEGACY_ROOT_KEY);

export const hasLegacyRoot = () => readLegacyRoot() != null;

/**
 * getStoredState's `deserialize(rawState[key])` followed by
 * redux-persist-transform-encrypt's `out`: AES.decrypt(value, secretKey).
 */
export const decodeLegacyValue = (sliceName, raw) => {
  let ciphertext;
  try {
    ciphertext = JSON.parse(raw);
  } catch (error) {
    throw sliceError(
      MIGRATION_ERROR_CODES.PARSE,
      sliceName,
      `Legacy slice "${sliceName}" is not a persisted ciphertext`,
      error,
    );
  }
  if (typeof ciphertext !== 'string') {
    throw sliceError(
      MIGRATION_ERROR_CODES.PARSE,
      sliceName,
      `Legacy slice "${sliceName}" is not a persisted ciphertext`,
    );
  }
  let text;
  try {
    text = Aes.decrypt(ciphertext, process.env.REDUX_WEB_KEY).toString(Utf8);
  } catch (error) {
    throw sliceError(
      MIGRATION_ERROR_CODES.DECRYPT,
      sliceName,
      `Legacy slice "${sliceName}" could not be decrypted`,
      error,
    );
  }
  if (!text) {
    throw sliceError(
      MIGRATION_ERROR_CODES.DECRYPT,
      sliceName,
      `Legacy slice "${sliceName}" decrypted to nothing (wrong REDUX_WEB_KEY?)`,
    );
  }
  return text;
};

const persistKey = name => `persist:${name}`;

const breadcrumb = (step, data) =>
  addBreadcrumb('storage', 'storage.migration', {step, ...data}, 'info');

const writePlainSlices = async slices => {
  for (const name of Object.keys(slices)) {
    if (!SEALED_SLICES.includes(name)) {
      await plainKv.set(persistKey(name), buildPersistEnvelope(slices[name]));
    }
  }
};

const markMigrated = async () => {
  const now = Date.now();
  await plainKv.set(STORAGE_KEYS.migratedAt, now);
  await plainKv.set(STORAGE_KEYS.legacyRetainedAt, now);
  await plainKv.set(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION.migrated);
};

const writeSealedSlices = async (slices, stateKey) => {
  for (const name of SEALED_SLICES) {
    if (slices[name] !== undefined) {
      await writeSealed(
        persistKey(name),
        buildPersistEnvelope(slices[name]),
        stateKey,
      );
    }
  }
};

/**
 * Writes the legacy key material to the (unlocked) vault and every sealed
 * slice under `stateKey`, then reads both back and runs the self-check.
 * Every write is awaited and every failure rejects, so nothing downstream may
 * treat the migration as done over data that never landed. Used for the
 * password migration and, after Registration, for the orphan state: that
 * rewrites every sealed slice under the new vault's key, including the ones
 * a failed earlier attempt left under a key that no longer exists.
 */
const sealLegacyState = async ({
  slices,
  vaultPayload,
  legacyWallets,
  stateKey,
}) => {
  await vault.saveSecrets(vaultPayload);
  await writeSealedSlices(slices, stateKey);
  const written = await readSealed(persistKey('wallets'), stateKey);
  const verification = verifyMigration({
    // Normalized copy: carries the clientIds assigned to pre-clientId wallets.
    legacyWallets,
    migratedWallets: written ? parsePersistEnvelope(written) : undefined,
    decryptedVault: await vault.readSecrets(),
  });
  if (!verification.ok) {
    const error = migrationError(
      MIGRATION_ERROR_CODES.VERIFY,
      `Migration self-check failed: ${verification.problems.join('; ')}`,
    );
    // Structure-only diagnostics (normalized path patterns, field inventory,
    // shape diffs, counts) so the failing path can be read off the event.
    // String values under neutral keys: scrubObject drops keys that look
    // sensitive.
    captureError(error, {
      tags: {area: 'storage', op: 'migrate', step: 'verify'},
      extra: {problems: verification.problems, ...verification.details},
    });
    throw error;
  }
};

/**
 * Runs the whole migration. Throws with a `code` from MIGRATION_ERROR_CODES on
 * corrupt/undecryptable legacy data or a failed self-check; the caller must
 * then block the app, never continue into an empty store.
 */
export const migrateLegacyRoot = async () => {
  const startedAt = Date.now();
  const raw = readLegacyRoot();
  if (raw == null) {
    return {status: 'none'};
  }

  let parsed;
  try {
    parsed = parseLegacyRoot(raw, {decodeValue: decodeLegacyValue});
  } catch (error) {
    const code =
      error?.code === MIGRATION_ERROR_CODES.DECRYPT
        ? MIGRATION_ERROR_CODES.DECRYPT
        : MIGRATION_ERROR_CODES.PARSE;
    captureError(error, {
      tags: {area: 'storage', op: 'migrate', step: code},
      // Slice name only; the data itself never leaves the device.
      extra: {slice: error?.slice ?? null},
    });
    throw migrationError(code, 'Stored wallet data could not be read', error);
  }
  const {
    slices,
    vaultPayload,
    legacyWallets,
    password,
    counts,
    residualSecrets,
  } = splitLegacyRoot(parsed.slices);
  if (residualSecrets && Object.keys(residualSecrets).length) {
    // A non-wallet slice held a secret under a shape no sanitizer knows. The
    // data written below is already deep-stripped, so this is a report, never
    // a failure (a hard stop here would strand the user on StorageErrorScreen).
    // Structure only: slice names, key names, normalized path patterns and
    // counts, never a value. Keyed `residual`, not `residualSecrets`: the
    // scrubber drops any key matching /secret/i, so beforeSend would strip the
    // whole diagnostic.
    captureError(new Error('Legacy slices carried secrets outside wallets'), {
      level: 'warning',
      tags: {area: 'storage', op: 'migrate', step: 'sanitize_other_slices'},
      extra: {residual: residualSecrets},
    });
  }

  let kdfMs = 0;
  if (password) {
    // A reload after the vault write but before schemaVersion=2 leaves a vault
    // behind; the redo replaces it wholesale.
    if (await vault.hasVault()) {
      await vault.destroy();
    }
    const kdfStart = Date.now();
    await vault.createVault(password);
    kdfMs = Date.now() - kdfStart;
    try {
      await sealLegacyState({
        slices,
        vaultPayload,
        legacyWallets,
        stateKey: await vault.getStateKey(),
      });
    } finally {
      vault.lock();
    }
  } else if (counts.wallets > 0 || SEALED_SLICES.some(n => slices[n])) {
    orphanLegacyState = {
      slices: Object.fromEntries(
        SEALED_SLICES.filter(n => slices[n] !== undefined).map(n => [
          n,
          slices[n],
        ]),
      ),
      vaultPayload,
      legacyWallets,
    };
    if (counts.wallets > 0) {
      captureError(new Error('Legacy wallets found without a password'), {
        level: 'warning',
        tags: {area: 'storage', op: 'migrate', step: 'orphan_wallets'},
        extra: {wallets: counts.wallets},
      });
    }
  }

  await writePlainSlices(slices);

  if (orphanLegacyState) {
    // Sealed data is only in memory: leave schemaVersion at 0 so a reload
    // before Registration redoes this from the blob instead of skipping it.
    const totalMs = Date.now() - startedAt;
    breadcrumb('pending', {...counts, totalMs});
    logger.info('storage.migration_pending', {...counts, totalMs});
    return {status: 'pending', counts, kdfMs, totalMs};
  }

  await markMigrated();

  const totalMs = Date.now() - startedAt;
  breadcrumb('done', {...counts, kdfMs, totalMs});
  logger.info('storage.migrated', {...counts, kdfMs, totalMs});
  return {status: 'migrated', counts, kdfMs, totalMs};
};

/**
 * 0 → 2 for the orphan path. Called by createAccount right after it created
 * the vault (unlocked, `stateKey` derived from it): seals and verifies the
 * parked state exactly like the password migration, then advances the
 * version. Rejects without advancing when any write or the self-check fails;
 * the parked state is never consumed here, so a retry redoes all of it.
 * Returns true when the version was advanced.
 */
export const commitOrphanLegacyMigration = async stateKey => {
  if (!orphanLegacyState) {
    return false;
  }
  await sealLegacyState({...orphanLegacyState, stateKey});
  if (
    ((await plainKv.get(STORAGE_KEYS.schemaVersion)) ??
      SCHEMA_VERSION.legacy) !== SCHEMA_VERSION.legacy
  ) {
    return false;
  }
  await markMigrated();
  breadcrumb('orphan_committed', {});
  return true;
};

/**
 * 2 → 3. Called right after the first successful unlock: the hydrated store is
 * the end-to-end proof, so the legacy blob can go. Returns true when finalised.
 */
export const finalizeLegacyMigration = async ({getState}) => {
  if (orphanLegacyState) {
    return false;
  }
  if (
    (await plainKv.get(STORAGE_KEYS.schemaVersion)) !== SCHEMA_VERSION.migrated
  ) {
    return false;
  }
  if (!vault.isUnlocked()) {
    return false;
  }
  const persistedRaw = await readSealed(
    persistKey('wallets'),
    await vault.getStateKey(),
  );
  const persistedIds = persistedRaw
    ? (parsePersistEnvelope(persistedRaw).allWallets || [])
        .map(w => w?.clientId)
        .sort()
    : [];
  const hydratedIds = (getState().wallets?.allWallets || [])
    .map(w => w?.clientId)
    .sort();
  if (JSON.stringify(persistedIds) !== JSON.stringify(hydratedIds)) {
    captureError(new Error('Hydrated wallets differ from persisted wallets'), {
      tags: {area: 'storage', op: 'migrate', step: 'finalize'},
      extra: {persisted: persistedIds.length, hydrated: hydratedIds.length},
    });
    return false;
  }
  removeLegacyRootBlob();
  await plainKv.set(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION.finalized);
  breadcrumb('finalized', {wallets: hydratedIds.length});
  return true;
};
