# DOK Wallet Chrome extension

This is a Manifest V3 Chrome extension built from the **web wallet sources**
in this repo. It is not a fork. Its own webpack build (`extension/`)
compiles `src/` and the `dok-wallet-blockchain-networks` submodule as they
are. This folder holds only what an extension does differently, so the
Next.js app does not know the extension exists.

The wallet opens in Chrome's **side panel** when you click the toolbar
button. Right-click the button and choose **Open … in a tab** for a full
page; the first install also opens a tab for onboarding.

The side panel was chosen over a popup because a popup closes as soon as
focus leaves it, and its script stops with it. That would break:

- buy/sell provider windows
- Google sign-in
- WalletConnect while you use a dApp

A side panel stays open while you browse other tabs. Google sign-in still
runs in the service worker (`src/extension/googleAuth.js`), so it finishes
even if the panel is closed during consent.

## Status

| Area                                                                                                   | State                                                                        |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Build (dev and production, both brands)                                                                | Works                                                                        |
| UI in the side panel and in a tab (all 79 web routes)                                                  | Works                                                                        |
| Registration, vault, password login                                                                    | Works (tested in Chrome)                                                     |
| Staying unlocked between panel opens, auto-lock, lock in every page                                    | Works (tested in Chrome)                                                     |
| Address derivation on all 20 chains, derivation workers, protobuf, Breez WASM, under the extension CSP | Works (`selftest.html`)                                                      |
| **Every DokApi call apart from the white-label lookup**                                                | **Blocked by the backend.** See [Backend changes](#backend-changes-required) |
| Google Drive backup/restore                                                                            | Implemented. Needs an OAuth client id (see below)                            |
| Bitcoin over Electrum                                                                                  | Uses the DokApi fallback, or a bridge URL if you configure one               |
| WalletConnect                                                                                          | Works while the side panel or a tab is open. Not tested end-to-end           |

## Setup

Everything runs from the repo root; the extension uses the web wallet's
`node_modules` and `.env`.

```bash
git submodule update --init && yarn install
cp extension/.env.example extension/.env   # fill in what you need, see below

yarn ext:build        # DOK Wallet  -> extension/dist/dokwallet
yarn ext:build:kiml   # KIML Wallet -> extension/dist/kimlwallet
yarn ext:build:all    # both of the above, one after the other
yarn ext:dev          # development build (+ selftest.html), rebuilt on change
yarn ext:zip          # extension/dist/<brand>-<version>.zip for the Web Store
yarn ext:check        # are the copied overrides still in sync with src/?
```

The extension version is `version` in `extension/extension.config.js`.
It is separate from the web app's version, because the Chrome Web Store
needs it to go up with every upload.

**Load it:** open `chrome://extensions`, turn on Developer mode, click
**Load unpacked** and pick `extension/dist/dokwallet`. After a rebuild, click the
reload icon on the extension card.

**Debug:**

- UI: right-click inside the side panel and choose **Inspect**, or use
  DevTools in the tab.
- Service worker: click the **service worker** link on the extension card.
- Chain libraries: in a development build, open
  `chrome-extension://<id>/selftest.html`. It derives a throwaway wallet on
  every chain inside the extension.

## How it works

```
extension/src/
  app/          Root.jsx: replaces web_wallet/src/app/layout.js (a server
                component). Same provider tree; white-label data is fetched
                on the client; i18n has no server.
  router/       Hash router: app.html#/wallet/<id>/home/. A path URL would
                point at a file. Routes are generated from web_wallet/src/app
                (scripts/generate-routes.js), including layouts, dynamic
                segments and catch-alls.
  shims/        Aliased in place of packages that need Next or a server:
                next/navigation, next/link, next/image, next/font,
                next/headers, next-auth/react, @sentry/nextjs, react-ga4,
                react-google-recaptcha-v3.
  overrides/    src/overrides/<path> replaces <web_wallet>/<path> wherever it
                is imported from. An override reaches the file it replaces
                through `@web-original/<path>`.
  extension/    Extension-only modules: unlock session, Google auth,
                in-page API routes.
  background/   Service worker: side panel, "open in tab" menu, Google
                sign-in, auto-lock alarm. It holds no wallet keys.
```

The overrides and why each one exists:

| Override                                         | Why                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `security/secureStore.js`                        | The web IndexedDB store, except the vault's "biometric" slot goes to `chrome.storage.session` (the unlock session, below) |
| `security/unlockFlow.js` ⚠ copy                  | Adds `unlockWithSession()`. Password unlock keeps the session; lock clears it and locks every open page                   |
| `app/auth/login/page.jsx`                        | Unlocks from the session if there is one, otherwise shows the web login                                                   |
| `utils/apiCaptcha.js`                            | Sends `x-app-name: <brand>-extension` instead of a reCAPTCHA token                                                        |
| `utils/electrumTransport.js`                     | No `/api/bitcoin` route of its own: uses an optional bridge URL, else the DokApi fallback                                 |
| `utils/updateLocale.js`, `utils/localeCookie.js` | Locale in localStorage instead of a server action plus cookie                                                             |
| `utils/localStorageData.js`                      | Also reports activity to the unlock session                                                                               |
| `utils/autoLock.js`                              | Label for `0`: "When the wallet is closed"                                                                                |
| `whitelabel/whiteLabelInfo.js`                   | Uses the brand domain and site URL instead of `window.location` (`chrome-extension://…`)                                  |
| `components/ModalReset/index.jsx` ⚠ copy         | Reloads to a hash route after "Forgot password"                                                                           |

⚠ **copy** means the override is a full copy of the upstream file. It
records the upstream hash it was copied from. The build warns, and
`yarn ext:check` fails, when the web wallet's file has changed and
the copy needs merging again. Every other override wraps the upstream module
and picks up its changes automatically.

The Next.js API routes are handled inside the page (`src/extension/apiRoutes.js`).
The web client's own `fetch('/api/drive/...')` calls are answered there with
the same contract as the route files, so `utils/googleDriveBackup.js` runs
unchanged.

### Unlock session and auto-lock

On the web every page load locks, because the vault key (DEK) only lives in
page memory. An extension page opens and closes every time the side panel
does, so the extension works like this:

- After unlocking, the extension also keeps the DEK in
  `chrome.storage.session`. That storage is in memory only, is cleared when
  the browser quits, and is not readable by content scripts.
- The next page opened within the auto-lock time unlocks without the
  password. It reuses the shared vault's biometric slot, so the vault code is
  unchanged.
- The service worker checks once a minute and removes the key once the
  auto-lock time has passed since the last activity.
- Locking in one page (idle lock, logout, reset) locks every open extension
  page.
- Auto-lock `0` (the default) keeps no session, so the wallet locks whenever
  it is closed.

## Backend changes required

1. **DokApi app name (blocking).** The API accepts only known
   `x-app-name` values. `<brand>-web` additionally requires a reCAPTCHA v3
   token, which an extension cannot produce: the script is remote and the
   site keys are bound to domains. Today every call apart from
   `/get-white-label` gets a 401. The fix:
   - Accept `dokwallet-extension` and `kimlwallet-extension` (and the other
     brands if they get builds).
   - Verify them some other way, as is done for `-ios` and `-android`.
   - The suffix is configurable (`EXT_APP_NAME_SUFFIX`) if you prefer
     another name.
2. **CORS.** Requests come from `chrome-extension://<id>`. The DokApi host
   is in `host_permissions`, so Chrome does not enforce CORS for it, but the
   server must not reject that Origin.
3. **Optional: Electrum bridge.** Point `ELECTRUM_BRIDGE_URL` at a deployed
   web wallet's `/api/bitcoin` to get the Electrum path back. Its host is
   added to `host_permissions` automatically.

## Google Drive backup

You need one OAuth client per brand:

- Type **Web application**.
- In the **same Google Cloud project as that brand's mobile app**. Drive's
  appDataFolder is per project, so a different project cannot see mobile
  backups.
- Authorised redirect URI: `https://<extension-id>.chromiumapp.org/`.
- Put the client id in `.env` (`DOK_WALLET_GOOGLE_EXTENSION_CLIENT_ID` and
  the KIML equivalent). `WALLET_BACKUP_SECRET` must match mobile and web.

The extension id depends on the key Chrome assigns. To keep the id stable
across machines while developing, set `EXTENSION_KEY` to the public key from
the Chrome Web Store dashboard.

Sign-in uses `chrome.identity.launchWebAuthFlow` (no client secret, no
server). The access token is kept in `chrome.storage.session`. The backup
secret ships inside the extension, as it does in the mobile app.

## Differences from the web build

- No reCAPTCHA. Google Analytics is a no-op because gtag.js is a remote
  script (see `src/shims/react-ga4.js`). Sentry posts straight to Sentry,
  without the `/monitoring` tunnel.
- `host_permissions` lists only the DokApi host (plus the bridge if you set
  one). Public RPCs and explorers already serve the web wallet
  cross-origin. If one rejects the extension origin, add its host in
  `scripts/manifest.js`. Avoid `<all_urls>`: it shows the "read and change
  all your data" warning.
- Roboto loads from Google Fonts (the web build self-hosts it through
  `next/font`).

## Known follow-ups

- **Bundle size.** `app.js` is about 32 MB minified. The shared redux slices
  import every chain SDK, so they all load at start. A warm open takes about
  2 s; the very first open takes longer (white-label fetch plus code
  compile). Lazy-loading the chain modules in the submodule would help both
  web and extension.
- **WalletConnect** needs a page to be open. To keep sessions alive with the
  side panel closed, run it in an offscreen document.
- **Two open pages** (side panel plus tab) each hold their own store. Concurrent
  edits can overwrite each other, as with two web tabs.
- **dApp provider** (`window.ethereum` / EIP-6963) does not exist in the web
  wallet and is not part of this build. It would need a content script,
  approval UI, and signing outside the page.
