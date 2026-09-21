# Secure Storage & Key Management — Final Cross-Platform Plan (mobile + web)

Date: 2026-09-19 · Status: APPROVED 2026-09-19 · Phases 1–5 implemented 2026-09-19 on branch `divyang/vault-v2` (mobile, web, submodule), uncommitted (Phase 5: KDF re-wrap, Android/iOS backup + data-protection rules, screenshot guards, D2 confirm on WalletConnect approve, web zeroise-on-lock, W5; mobile zeroise-on-lock, WebAuthn-PRF and sealing mobile Tier 1 deliberately not done); manual QA matrix (§7), the R9b before/after measurement (§7 Performance) and staged rollout pending. Phase 4 deviation: WalletConnect `walletData` is slimmed, not dropped — nothing rebuilds it from sessions today. Phase 3 note: `crypto-js` + `REDUX_WEB_KEY` (web) and the Android SharedPreferences step (mobile) are kept on purpose — they are migration inputs and go only once `storage.migration` finalised coverage is ~100 % · Supersedes `2026-09-18-secure-storage-redesign.md` + `2026-09-19-…-amendments.md` (both stay as history; this doc becomes the executable spec)

Repos: `mobile_app` = `~/Developer/ReactNative/dokwallet_app` (RN 0.86, RTK 2.10, quick-crypto 1.1.7, RNSI 5.6.2) · `web_wallet` = `~/Developer/React/dokwallet_web` (Next 16.3 app router, webpack, RTK 1.9.7, redux-persist 6, Node ≥22) · shared submodule `dok-wallet-blockchain-networks` (same remote, mobile pinned at `095c9f2`, web one test-only commit ahead at `72b9200`).

**Deliverable after approval (user chose "save spec only"):** write this document to `docs/superpowers/specs/2026-09-19-secure-storage-final-plan.md` in **both** repos, add a one-line "Superseded by …" status to the two older mobile docs, and stop. No code until a second approval.

---

## 0. Context

Two reported problems on mobile, both confirmed to exist on web in a worse form:

| | Mobile today | Web today |
|---|---|---|
| Freeze | whole store → 1 string → re-encrypted in Keychain/Keystore on every action | whole store → crypto-js AES-CBC → **synchronous `localStorage`** on every action (5 MB quota, silent failure when exceeded) |
| Password | plaintext in `auth.password`, `===` compare | same slice, same compare (`login/page.jsx:75`, `ModalConfirmTransaction/index.js:88`) |
| Secrets at rest | mnemonics + keys in the same blob, `accessControl:'none'` | same blob, key = `REDUX_WEB_KEY` **inlined into the client bundle** (`next.config.js:29`), `.env` value is literally `test`; crypto-js AES-CBC with 1-iteration MD5 KDF, no auth tag |

Goal: one design, one shared implementation, two thin platform adapters, no data loss for existing users, and persist writes that no longer block the UI on either platform.

### 0.1 What exploration changed

- **The submodule contains zero native code.** `dok-wallet-blockchain-networks/service/wallet.service.js` is pure JS. The "native" file the user means is `src/myWallet/wallet.service.js` in *each app*: mobile is a `NativeModules.NativeKeygen` bridge (118 lines), web is a pure-JS bip39/ethers implementation (700 lines), same exports. The submodule imports it as `myWallet/wallet.service` (`cryptoChain/index.js:11`, `walletsSlice.js:97`) and each app resolves that bare alias to its own file — mobile via `babel.config.js:13-21` (`root: ['./src']`), web via `jsconfig.json:3-19` + `jest.config.js:28-42`.
- ~25 such seams already exist (`utils/toast`, `utils/hideWallet`, `utils/navigation`, `utils/localStorageData`, `services/logger`…). `utils/hideWallet` is the exact precedent for crypto: mobile uses quick-crypto PBKDF2, web uses WebCrypto, same API.
- **This is the mechanism we reuse.** Shared vault logic lives in the submodule and imports two new aliases, `security/vaultCrypto` and `security/secureStore`; each app supplies its own file. No `Platform.OS`, no `isWeb` branches in shared code.
- User decisions (2026-09-19): shared logic in the submodule behind aliases; **web non-secret state is sealed under the password DEK** (nothing readable before unlock); save spec only for now.

---

## 1. Shared architecture

### 1.1 Key hierarchy (identical on both platforms)

```
password ─PBKDF2-HMAC-SHA256(600 000, salt 32B)─▶ KEK ─AES-256-GCM─▶ vault.dek.password   (wrapped DEK)
DEK = random 32B ─AES-256-GCM─▶ vault.blob                                (mnemonics, keys)
DEK ─HKDF-SHA256(info 'dok.state.v1')─▶ stateKey                          (web: seals Tier 1; mobile: unused until Phase 5)
DEK raw ─ under biometryCurrentSet ─▶ vault.dek.biometric                  (mobile only, optional)
```

- Password correctness = GCM unwrap succeeds. Password is **never stored**. `auth.hasAccount` (new boolean) replaces the "non-empty password" check for routing on both platforms.
- KDF params travel in the envelope (upgrade in place later, MetaMask pattern).
- Envelope change vs the 09-18 spec §3.3: `ct` **includes the 16-byte GCM tag appended** (WebCrypto's native shape; the mobile adapter concatenates `getAuthTag()`). No separate `tag` field. AAD strings unchanged (`dok.dek.password.v1`, `dok.vault.v1`, new `dok.state.v1`).
- Vault plaintext v1 unchanged (per `clientId`: `phrase`, `privateKey`, `coins[coinKey]`, `chainExisting[chain]`, `deriveKeys[family][derivePath|address]`), **plus `hideSettings`** moved into the vault (amendment 12.3.3).

### 1.2 Code placement

**Submodule (shared, pure, tested once, runs in both Jest suites):**

| File | Contents |
|---|---|
| `security/vaultCore.js` (new) | envelope build/parse, `wrapDek/unwrapDek`, `encryptBlob/decryptBlob`, `deriveStateKey`, KDF-param staleness check. Pure functions over the `vaultCrypto` adapter. |
| `security/vault.js` (new) | state machine: DEK in module scope, `createVault`, `unlockWithPassword`, `unlockWithBiometric` (no-op error if adapter lacks capability), `verifyPassword`, `changePassword` (re-wrap only), `enable/disableBiometric`, `saveSecrets`, `getStateKey`, `lock`, `destroy`, `isUnlocked`. Imports `security/vaultCrypto`, `security/secureStore`. |
| `redux/wallets/walletSecrets.js` (new) | `SECRET_WALLET_FIELDS`, `stripWalletSecrets`, `extractVaultPayload`, `hydrateWalletSecrets` (pure merge), `assertNoSecrets`. |
| `redux/wallets/walletsSlice.js` | add `hydrateWalletSecrets` reducer (merge only, never overwrite with `undefined`). |
| `redux/auth/authSlice.js`, `authSelectors.js` | **additive only** (amendment 12.2.1): `hasAccount` + `getHasAccount`; keep `password` writes and `getUserPassword` until Phase 3. |
| `redux/storage/legacyRootMigration.js` (new) | pure: `splitLegacyRoot(parsedSlices) → {plainSlices, sealedSlices, vaultPayload, password}`, applies `currentWalletIndex→currentWalletClientId`, strips secrets, builds per-slice redux-persist envelopes (`{field: JSON, _persist: {version:1, rehydrated:true}}`), `verifyMigration(legacy, written, decryptedVault)`. Per-app code only reads/decrypts the legacy blob and writes the outputs. |
| `security/__fixtures__/vault.v1.json` | known-answer vectors (password, salt, iterations, wrapped DEK, blob). Decrypt test runs in **both** repos → proves cross-platform envelope compatibility. |

**Per-app adapters (same export surface):**

| Alias | Mobile `src/security/…` | Web `src/security/…` |
|---|---|---|
| `security/vaultCrypto` | quick-crypto: async `pbkdf2` callback form (as `hideWallet.js:31-46`), `createCipheriv('aes-256-gcm')` + tag concat, `randomBytes`, `hkdf`. | WebCrypto `subtle`: PBKDF2 `deriveBits` **inside a Web Worker** `src/workers/kdfWorker.js` (pattern from `src/workers/*DerivePathWorker.js`); falls back to main-thread `subtle` when `typeof Worker === 'undefined'` (Jest). AES-GCM, HKDF, `getRandomValues`. |
| `security/secureStore` | RNSI 5.6.2 (pinned exact) under `SECURE_STORE_KEYCHAIN_NAME`; `get/set/remove(key, {accessControl, authenticationPrompt})`; `capabilities = {biometric: true}`; Android missing-key throw normalised to `null`. | IndexedDB db `dok-secure`, store `kv`, ~60-line inline helper (no dependency); `capabilities = {biometric: false}`. |

Adapter API (both): `randomBytes(n): Uint8Array` · `pbkdf2(pw: string, salt: Uint8Array, iterations, keyLen): Promise<Uint8Array>` · `hkdf(ikm, salt, info, len): Promise<Uint8Array>` · `aesGcmEncrypt(key, iv, plaintext, aad): Promise<Uint8Array /*ct||tag*/>` · `aesGcmDecrypt(key, iv, ctWithTag, aad): Promise<Uint8Array>` (throws on auth failure) · base64 helpers. Everything async-only (WebCrypto has no sync path).

Alias wiring: mobile needs nothing (`root: ['./src']` covers `src/security`). Web adds `"security/*": ["./src/security/*"]` to `jsconfig.json` and the mirror entry in `jest.config.js` `moduleNameMapper`.

---

## 2. Mobile storage layout (unchanged from 09-18 spec + amendments)

```
TIER 0  RNSI  (hardware-backed)     storage.mmkvKey · vault.dek.password · vault.dek.biometric · vault.blob
TIER 1  MMKV 'dok.state' AES-256    persist:<slice> ×11, secrets stripped · storage.schemaVersion/migratedAt
```
Per-slice `persistReducer`, `throttle: 1000`, `timeout: 0`, field-level transforms, `PersistGate`, vault listener middleware + **awaited `vault.saveSecrets` on wallet-creating paths** (12.3.4), hydrate-time `vault.missing_secrets` check, reinstall detection (12.3.2), headless task skips KDF (12.3.5), `deleteMMKV` in wipe (12.3.1), pre-unlock entry-point audit (12.2.2), R9 split into R9a/R9b (12.2.3). Details: 09-18 spec §3–§7.

---

## 3. Web storage layout (new — DEK-sealed Tier 1)

```
TIER 0  IndexedDB 'dok-secure' / kv       vault.dek.password · vault.blob · vault.meta
TIER 1  IndexedDB 'dok-state'  / plain    persist:auth (no password) · persist:settings · storage.schemaVersion/migratedAt
                               / sealed   persist:wallets · persist:sellCrypto · persist:batchTransaction
                                          persist:customRpc · persist:sentAddressHistory
                                          value = {v:1, iv, ct} = AES-256-GCM(stateKey, envelopeJSON, aad 'dok.state.v1')
```

- **Why IndexedDB, not localStorage:** async (no main-thread block — this is the web half of the freeze fix), no 5 MB quota, binary-safe. Safari's 7-day eviction for non-installed sites applies equally to localStorage today, so no regression.
- **Plain slices** are exactly what the pre-login screens need: `auth` (`hasAccount`, `attempts`, `maxAttempt`, `lastAttempt`), `settings` (theme, locale, `lockTime`, `isWalletReset`). Everything privacy-relevant is sealed.
- **Web has no hardware store.** The password KDF is the only real boundary; `attempts` lockout in plain IDB is UX defence only (same statement as amendment 12.3.7). Written down, not implied.

### 3.1 Boot / unlock sequence (web)

1. `bootstrapStorage()` (memoised): open both DBs; if `storage.schemaVersion` absent and legacy `localStorage['persist:root']` present → run migrator (§5.2). Client-only; guarded by `typeof window`.
2. `persistStore` → all 7 slices receive PERSIST. **Plain adapter** reads normally. **Sealed adapter** `getItem` returns `null` while `!vault.isUnlocked()` → slice rehydrates as initial state → `PersistGate` opens → Login renders.
3. **Sealed adapter `setItem` is a no-op while it has no `stateKey`** (breadcrumb `sealed.write_dropped`). This is what stops redux-persist's persistoid from writing initial state over the stored ciphertext between boot and unlock.
4. Login → `vault.unlockWithPassword(pw)` → for each sealed key: `getStoredState` via the sealed adapter using the DEK-derived `stateKey`, then `store.dispatch({type: REHYDRATE, key, payload})`. **Verified:** `redux-persist/lib/persistReducer.js:130-150` has no "already rehydrated" guard on REHYDRATE, so a second rehydrate runs the normal `autoMergeLevel1` reconciler.
5. Only **after** every sealed key is rehydrated → `sealedStorage.enableWrites(stateKey)`. Ordering here is the web equivalent of amendment 12.3.4; a test dispatches wallet actions during the window and asserts nothing was written.
6. `dispatch(hydrateWalletSecrets(payload))`; then the existing post-load thunks that today run at `AppRouting/index.jsx:208-246` **move to after unlock**: `resetCoinsToDefaultAddressForPrivacyMode`, `reassignCurrentWalletIfHidden`, `refreshCoins`, `initWalletConnect`. Non-wallet ones (`fetchCurrencies`, `fetchRPCUrl`, `createAIDIfNotExists`) stay pre-unlock.
7. Idle lock (`AppRouting:181-205`) and lock-on-load keep working: idle lock routes to Login with state still in memory (Phase 2 keeps secrets in memory, same as mobile §6.3); re-login re-derives DEK, skips rehydrate if slices already `rehydrated` with data. Full reload → step 2 again. Zeroise-on-lock is Phase 5 and matters more on web.

### 3.2 Web-specific defects folded in

W1 `devTools: true` unconditional (`store.js:120`) → `process.env.NODE_ENV !== 'production'`. W2 Logout never dispatches `logOutSuccess` (`ModalReset/index.jsx:76-79`) → `vault.lock()` + route. W3 Change-password does not block on wrong current password (`change-password/page.jsx:33-46`) → `vault.changePassword`. W4 Reset overwrites but never removes storage → `wipeAllLocalData()` deletes both DBs + `persist:root` + `wc@2*` keys. W5 `wallet-lightning.service.js:9-84` keeps mnemonics as Map keys → note, Phase 5. W6 `REDUX_WEB_KEY`, `crypto-js`, `redux-persist-transform-encrypt` → removed Phase 3.

---

## 4. UI touchpoints (Phase 2, both apps)

Same list, two implementations. Every `===` against `getUserPassword` becomes a vault call; every routing guard becomes `getHasAccount`.

| Flow | Mobile files | Web files |
|---|---|---|
| Login | `LoginComponent/index.js:145-176, 88-102` | `src/app/auth/login/page.jsx:54,75` |
| Verify (seed reveal) | `VerifyLoginScreen/index.js:74` | `src/app/verify/verify-login/page.jsx:58,127` |
| Confirm tx | `ModalConfirmTransaction/index.js:93` | `src/components/ModalConfirmTransaction/index.js:36,88` |
| Change password | `ChangePassword/index.js:31-48` | `src/app/settings/change-password/page.jsx:28-46` |
| Registration | `RegistrationScreen/index.js:26-33` → `createVault` first | `src/app/auth/registration/page.jsx:41-49` |
| Routing | `main.js:140`, `router.js:108-134` | `AppRouting/index.jsx:85,278-292`, `CarouselCards:16,84`, `LegacyRouteRedirect:37`, `wallet/[clientId]/layout.jsx:32` |
| Biometric | `ModalFingerprintVerification`, `Settings:73-78` | none (already commented out) |
| Reset / delete | `ModalDeteletData:18`, `delete.js:10`, `ModalReset` | `ModalReset/index.jsx:60-80`, logout |
| WalletConnect key lookup | `WalletConnectTransactionModal.js:432` → live coin | `WalletConnectTransactionModal/index.jsx:240` → live coin |
| Drive backup/restore | `BackupWallets.js`, `RestoreWallets.js` | `settings/backup/page.jsx`, `settings/restore/page.jsx` — already take the typed password; unchanged crypto, byte-compatible |

`verifyPassword` costs one 600k PBKDF2 (~0.5–2 s low-end Android, ~0.2–0.6 s desktop in a worker). Spinner needs product sign-off (12.3.7).

---

## 5. Migration (R7) — zero data loss, idempotent, legacy retained until proven

State machine on `storage.schemaVersion`: absent → migrate · `2` → new stores written, legacy retained · `3` → legacy deleted after first successful unlock. `schemaVersion = 2` is the **last** write, so a kill anywhere before it redoes cleanly.

### 5.1 Mobile (`src/redux/storage/migrateLegacyRoot2.js`)
As 09-18 spec §7 + amendments: read `persist:root2` from RNSI, `splitLegacyRoot`, PBKDF2 (skipped in headless context), write vault + MMKV slices, self-verify, `schemaVersion=2`, iOS-only biometric copy, finalise in Login.

### 5.2 Web (`src/redux/storage/migrateLegacyRoot.js`)
1. Read `localStorage['persist:root']`; outer JSON; **each slice value is a crypto-js ciphertext string** (`redux-persist-transform-encrypt/lib/sync.js` encrypts per slice with `Aes.encrypt(stringify(state), secretKey)`). Decrypt each with `Aes.decrypt(v, process.env.REDUX_WEB_KEY).toString(Utf8)` — the key is still inlined at migration time; `crypto-js` stays a dependency until Phase 3.
2. `splitLegacyRoot` (shared). `password = auth.password`.
3. If password non-empty: create vault (KDF in worker), derive `stateKey`, write sealed slices; write plain slices with `hasAccount: true`. If empty: plain slices only, `hasAccount:false`, no vault; orphan-wallets edge case as mobile §7.
4. Self-verify: decrypt sealed `persist:wallets` and vault, `verifyMigration`.
5. `schemaVersion = 2`. Finalise (`3`) in Login after first unlock: `localStorage.removeItem('persist:root')`.
- Corrupt / undecryptable legacy → `captureError` tag `migrate.step=decrypt`, leave legacy untouched, blocking error screen (never route to onboarding).
- Downgrade: before finalise an older build still reads `persist:root`; after, it starts fresh. Release note.
- Browser "clear site data" wipes both DBs and localStorage together → no reinstall-orphan case on web.

---

## 6. Phases & release coordination

Each phase independently shippable; TDD per task; stacked PRs into a release branch (amendment 12.4).

**Phase 0 — Spec (this approval).** Write spec to both repos. Merge web submodule branch `divyang/test-fixes` (`72b9200`, tests only) into submodule `main` so both apps pin one commit.

**Phase 1 — Foundations (no behaviour change).**
- Submodule: `security/vaultCore.js`, `security/vault.js`, `walletSecrets.js`, `hydrateWalletSecrets`, `hasAccount`/`getHasAccount`, `legacyRootMigration.js`, fixtures, tests.
- Mobile: `src/security/{vaultCrypto,secureStore}.js`, `src/redux/storage/{bootstrap,mmkvStorage,wipe}.js`, add `react-native-mmkv 4.3.x`, pin RNSI `5.6.2`, `.env` `SECURE_STORE_KEYCHAIN_NAME`, Jest mocks (MMKV, RNSI), dev-only persist timing breadcrumb (R9a baseline).
- Web: `src/security/{vaultCrypto,secureStore}.js`, `src/workers/kdfWorker.js`, `src/redux/storage/{idb,plainStorage,sealedStorage,bootstrap,wipe}.js`, `security/*` alias in `jsconfig.json` + `jest.config.js`, timing breadcrumb baseline.
- Definition of done: both repos' Jest green on the same submodule commit; fixture vectors decrypt on both.

**Phase 2 — Engine swap + vault + migration (fixes both issues, both apps).**
Per-slice persist, transforms, `throttle:1000`, `timeout:0`, `PersistGate`, listener middleware + awaited writes, migrator + finalise, bootstrap gate + error screen, all §4 touchpoints, pre-unlock entry-point audit with one locked-store test per app, `wipeAllLocalData`, W1–W4. Staged rollout; monitor `storage.migration` breadcrumbs. Submodule bump reviewed against **both** consumers; web must boot an existing localStorage profile.

**Phase 3 — Cleanup (one release later).** Delete `getUserPassword` + `state.password` writes from the submodule (both apps now on `getHasAccount`); remove `redux-persist-sensitive-storage` (mobile), `redux-persist-transform-encrypt` + `crypto-js` + `REDUX_WEB_KEY` (web); drop legacy Android SharedPreferences migration.

**Phase 4 — Slimming (R9b, both).** Persist ≤200 recent `coins[*].transactions`, drop `nft`/`walletData` from persistence; XMTP bodies stay in encrypted `dok.state` with a cap (amendment 12.3.6). Re-measure.

**Phase 5 — Hardening (separate approvals).** Zeroise on lock (`isUnlocked` gate in `getCoin`/`getNativeCoin`, callers queue) — priority on web; mobile option to seal Tier 1 under `stateKey` like web; Android `dataExtractionRules` + iOS data-protection entitlement; screenshot guards; WalletConnect approve via `ModalConfirmTransaction`; KDF re-wrap on stale params; web WebAuthn-PRF biometric (optional); lightning mnemonic Map (W5).

---

## 7. Verification

**Shared (submodule, runs in both repos):** `vaultCore.test.js` (round-trip, wrong password fails by GCM auth, tamper fails, `changePassword` leaves blob byte-identical, fixture vectors decrypt), `vault.test.js` (state machine, biometric capability gating), `walletSecrets.test.js` (`hydrate(strip(w), extract(w)) ≡ w` over mnemonic/EVM-50-derive/private-key-import/WalletConnect fixtures; `strip` passes `assertNoSecrets`), `legacyRootMigration.test.js` (split, envelopes, `hasAccount`, idempotency, empty password).

**Mobile:** `migrateLegacyRoot2.test.js` (RNSI fixture, kill simulation, corrupt JSON), `store.persist.guard.test.js` (`assertNoSecrets` over every MMKV value after secret-bearing actions), `vaultListener.test.js`, headless-skips-KDF test, locked-store entry-point test. Existing `walletconnect.*.test.js` mocks stay valid. Full `npx jest` green (known Solana/Hedera ESM suites excepted).

**Web:** `migrateLegacyRoot.test.js` (crypto-js legacy fixture → sealed/plain IDB via `fake-indexeddb` dev dep), `sealedStorage.test.js` (null while locked, **writes dropped between unlock and rehydrate**, rehydrate dispatch merges), `store.persist.guard.test.js`, locked-store entry-point test. `yarn test` green; `yarn build` succeeds (webpack worker bundling).

**Manual QA:** mobile matrix from 09-18 spec §9.3 (a–p) + headless-during-migration. Web: upgrade from current build with (a) 3 mnemonic wallets incl. 50 EVM derives + custom derivation, (b) private-key import, (c) hidden wallet RELAUNCH/MANUAL, (d) onboarding incomplete, (e) reload during first load, (f) forgot / reset / logout then re-onboard, (g) change password + reload, (h) idle lock at 0/1/5 min then re-login, (i) WalletConnect session survives + signs, (j) Drive backup then restore across mobile↔web, (k) send one tx per chain family, (l) previous build before/after finalise, (m) Safari + Chrome + Firefox, private window (IDB unavailable → blocking error, not onboarding), (n) KDF latency in worker.

**Performance (R9a):** dev-only `{slice, bytes, ms}` breadcrumb before (Phase 1) and after (Phase 2, 4) on the same wallet set; numbers in PR descriptions.

---

## 8. Open items to confirm during Phase 1
- `react-native-mmkv` 4.3.x: `deleteMMKV`/`existsMMKV` presence; 32-byte key limit.
- MMKV/Nitro in Android headless JS without an Activity.
- WebCrypto `subtle` availability inside a Next 16 webpack Worker bundle; `fake-indexeddb` for Jest.
- Exact RNSI `authenticationPrompt` field names.
- Whether `hideSettings` verification paths (`walletsSlice.js:2350,2377`) read it before unlock anywhere on web (`reassignCurrentWalletIfHidden` moves post-unlock, so expected no).
- Product: confirm-transaction spinner copy; forgot-password copy ("seed phrase or nothing").
- Production `REDUX_WEB_KEY` value class (needed only to confirm migration decrypts in prod).

## 9. Critical files
Submodule: `security/{vaultCore,vault}.js`, `redux/wallets/{walletSecrets,walletsSlice}.js`, `redux/auth/{authSlice,authSelectors}.js`, `redux/storage/legacyRootMigration.js`.
Mobile: `src/security/*`, `src/redux/{store.js,storage/*}`, `App.js`, `MainApp.js`, `main.js`, `index.js`, §4 screens.
Web: `src/security/*`, `src/workers/kdfWorker.js`, `src/redux/{store.js,StateProvider.jsx,storage/*}`, `src/components/AppRouting/index.jsx`, `next.config.js` (drop `REDUX_WEB_KEY` in Phase 3), `jsconfig.json`, `jest.config.js`, §4 pages.
