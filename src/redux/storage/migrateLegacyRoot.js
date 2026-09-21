// One-time migration of the legacy web blob — `localStorage['persist:root']`,
// one crypto-js AES ciphertext per slice keyed by the build-time REDUX_WEB_KEY
// (redux-persist-transform-encrypt) — into IndexedDB plain/sealed slices plus
// the vault.
//
// State machine on `storage.schemaVersion` in the plain store (spec §5.2):
//   0 legacy    → migrate; schemaVersion=2 is the LAST write, so a reload
//                 anywhere before it redoes cleanly from the untouched blob
//   2 migrated  → new stores written, legacy retained
//   3 finalized → legacy removed after the first successful unlock
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

// Legacy wallets found next to an empty password: nothing can be sealed yet.
// Their sanitized slices and secrets stay in memory for this session and are
// persisted once Registration creates a vault (unlockFlow.createAccount).
let orphanLegacyState = null;
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

/** redux-persist-transform-encrypt's `out`: AES.decrypt(value, secretKey). */
export const decodeLegacyValue = (sliceName, raw) => {
  let text;
  try {
    text = Aes.decrypt(raw, process.env.REDUX_WEB_KEY).toString(Utf8);
  } catch (error) {
    throw migrationError(
      MIGRATION_ERROR_CODES.DECRYPT,
      `Legacy slice "${sliceName}" could not be decrypted`,
      error,
    );
  }
  if (!text) {
    throw migrationError(
      MIGRATION_ERROR_CODES.DECRYPT,
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
    captureError(error, {tags: {area: 'storage', op: 'migrate', step: code}});
    throw migrationError(code, 'Stored wallet data could not be read', error);
  }
  const {slices, vaultPayload, legacyWallets, password, counts} =
    splitLegacyRoot(parsed.slices);

  let kdfMs = 0;
  let stateKey = null;
  if (password) {
    // A reload after the vault write but before schemaVersion=2 leaves a vault
    // behind; the redo replaces it wholesale.
    if (await vault.hasVault()) {
      await vault.destroy();
    }
    const kdfStart = Date.now();
    await vault.createVault(password);
    kdfMs = Date.now() - kdfStart;
    await vault.saveSecrets(vaultPayload);
    stateKey = await vault.getStateKey();
    await writeSealedSlices(slices, stateKey);
  } else if (counts.wallets > 0 || SEALED_SLICES.some(n => slices[n])) {
    orphanLegacyState = {
      slices: Object.fromEntries(
        SEALED_SLICES.filter(n => slices[n] !== undefined).map(n => [
          n,
          slices[n],
        ]),
      ),
      vaultPayload,
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

  if (password) {
    const written = await readSealed(persistKey('wallets'), stateKey);
    const verification = verifyMigration({
      // Normalized copy: carries the clientIds assigned to pre-clientId wallets.
      legacyWallets,
      migratedWallets: written ? parsePersistEnvelope(written) : undefined,
      decryptedVault: await vault.readSecrets(),
    });
    if (!verification.ok) {
      vault.lock();
      const error = migrationError(
        MIGRATION_ERROR_CODES.VERIFY,
        `Migration self-check failed: ${verification.problems.join('; ')}`,
      );
      captureError(error, {
        tags: {area: 'storage', op: 'migrate', step: 'verify'},
      });
      throw error;
    }
    vault.lock();
  }

  const now = Date.now();
  await plainKv.set(STORAGE_KEYS.migratedAt, now);
  await plainKv.set(STORAGE_KEYS.legacyRetainedAt, now);
  await plainKv.set(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION.migrated);

  const totalMs = Date.now() - startedAt;
  breadcrumb('done', {...counts, kdfMs, totalMs});
  logger.info('storage.migrated', {...counts, kdfMs, totalMs});
  return {status: 'migrated', counts, kdfMs, totalMs};
};

/**
 * 2 → 3. Called right after the first successful unlock: the hydrated store is
 * the end-to-end proof, so the legacy blob can go. Returns true when finalised.
 */
export const finalizeLegacyMigration = async ({getState}) => {
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
