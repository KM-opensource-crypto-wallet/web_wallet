This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Setup

You need to perform, following steps for different white label app to run on locally. If you not setup and by default open localhost. it will consider as "Dok Wallet" app. 

Run following command on terminal for mac of setup another hosts
```
sudo vi /etc/hosts
```
It will open hosts file in vi editor in the terminal of the mac. 
You need to add another host ``dokwallet_local`` after the localhost.
</br>
</br>
After you edit above hosts. the file "hosts" should look like below.
```
##
# Host Database
#
# localhost is used to configure the loopback interface
# when the system is booting.  Do not change this entry.
##
127.0.0.1       localhost dokwallet_local
255.255.255.255 broadcasthost
::1             localhost


```


## How to add new white label app

You need to update ``hostInfo`` variable in "helper.js" file.
</br>Currently We have following host
```angular2html
const dokWalletInfo = {
  iconFolderName: 'dokwallet',
  appName: 'DOK WALLET',
};

const pegasi51Info = {
  iconFolderName: '51pegasi',
  appName: '51PEGASI',
};

const hostInfo = {
  dokwallet_local: dokWalletInfo,
  ['www.dokwallet.app']: dokWalletInfo,
  ['www.51pegasi.ltd']: pegasi51Info,
  '51pegasi_local': pegasi51Info,
};

```
We have 2 apps dokwallet and 51pegasi. when we add new app add appName and add icon Folder in the assets folder similar to other one. 

## Crypto Provider for buy coins

Whenever we add new WL we need to add provider list for the new WL app in data.js file. Also need to update "allWhiteLabelProviderLists" variable in CryptoProviders page.

## Google Drive Backup & Restore

The backup/restore feature (Settings → Backup Wallets / Restore Wallets) needs the
following server-side environment variables in `.env`:

```bash
# Per-brand Google OAuth clients for NextAuth + Drive appDataFolder access.
# Each brand's client MUST belong to the SAME Google Cloud project as that
# brand's mobile app client, otherwise web cannot see backups created on
# mobile (appDataFolder is per-project). The brand is resolved per-request
# from the Host header (src/whitelabel/serverBrand.js); localhost and
# unknown hosts fall back to DOK.
DOK_WALLET_GOOGLE_WEB_CLIENT_ID=
DOK_WALLET_GOOGLE_WEB_CLIENT_SECRET=
KIML_WALLET_GOOGLE_WEB_CLIENT_ID=
KIML_WALLET_GOOGLE_WEB_CLIENT_SECRET=

# App-wide backup secret mixed into the encryption key together with the
# user's backup password. MUST be identical to the mobile app's
# WALLET_BACKUP_SECRET and must NEVER be rotated — existing backups would
# become unrecoverable.
WALLET_BACKUP_SECRET=

# Standard NextAuth configuration
NEXTAUTH_SECRET=
# Leave NEXTAUTH_URL unset in production (a single value cannot serve both
# brand domains); instead set AUTH_TRUST_HOST=true (automatic on Vercel) so
# the OAuth callback follows the request host. Dev defaults to localhost:3000.
```

Backups are encrypted client-side with AES-256-GCM (`v2-gcm` format, identical to the
mobile app) and stored as `wallet_backup_encrypted.json` in the Drive `appDataFolder`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
