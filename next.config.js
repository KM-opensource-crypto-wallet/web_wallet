/** @type {import('next').NextConfig} */
const {version, name} = require('./package.json');
const createNextIntlPlugin = require('next-intl/plugin');
const path = require('path');
const {loadEnvConfig} = require('@next/env');
const {withSentryConfig} = require('@sentry/nextjs/config');

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const withNextIntl = createNextIntlPlugin();
const nextConfig = {
  // Loaded with Node's own require() instead of being bundled. sodium-native
  // is @stellar/stellar-base's optional native signer; bundling it drags in
  // require-addon's dynamic require() and a "critical dependency" warning.
  serverExternalPackages: ['bitcore-lib', 'sodium-native'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    APP_VERSION: version,
    APP_NAME: name,
    DOK_WALLET_BASE_URL: process.env.DOK_WALLET_BASE_URL,
    REDUX_WEB_KEY: process.env.REDUX_WEB_KEY,
    WALLET_CONNECT_ID: process.env.WALLET_CONNECT_ID,
    BREEZ_API_KEY: process.env.BREEZ_API_KEY,
    // Sentry (src/services/logger). Next inlines NEXT_PUBLIC_* on its own, but
    // every client-visible variable is listed here so this block stays the one
    // place to look. The dev switches need it (no prefix), like ENV_MODE.
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SENTRY_ENABLE_IN_DEV: process.env.SENTRY_ENABLE_IN_DEV,
    SENTRY_DEV_TOOLS: process.env.SENTRY_DEV_TOOLS,
    SENTRY_DEBUG: process.env.SENTRY_DEBUG,
    ENV_MODE: process.env.ENV_MODE,
    SPONSOR_TREASURY_ADDRESS: process.env.SPONSOR_TREASURY_ADDRESS,
  },
  trailingSlash: true,
  reactStrictMode: false,
  // Next 16 bundles with Turbopack by default and refuses `next build` when a
  // custom webpack() is present, so the dev/build scripts pass `--webpack`.
  // Moving off webpack means translating this block: the alias map below to
  // `turbopack.resolveAlias` (with the `browser` condition for the fs /
  // sodium-native stubs), the svgr rule to `turbopack.rules`, and dropping
  // `externals` (optional deps are left unresolved by Turbopack anyway).
  webpack: (config, {isServer}) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.alias = {
      ...config.resolve.alias,
      tls: path.resolve('./node_modules/tls-browserify'),
      net: path.resolve('./node_modules/net-browserify'),
      http2: path.resolve('./node_modules/http-browserify'),
      http: path.resolve('./node_modules/http-browserify'),
      dns: path.resolve('./node_modules/@i2labs/dns'),
    };
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Node-only modules that browser code never executes but still
        // references statically (libsodium's `if (isNode) require('fs')`,
        // stellar-base's optional `require('sodium-native')`). `false`
        // gives webpack an empty module, which is what stellar-base's own
        // "browser" field asks for. The former bare-fs alias could never run
        // in a browser (it needs the Bare runtime global) and pulled in
        // bare-os's dynamic native require().
        fs: false,
        'sodium-native': false,
      };
    }
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
  async rewrites() {
    return [
      // Your existing rewrites...

      // Handle ONLY specific mobile app files - leave other .well-known files untouched
      {
        source: '/.well-known/apple-app-site-association',
        destination: '/api/.well-known/apple-app-site-association',
      },
      {
        source: '/.well-known/assetlinks.json',
        destination: '/api/.well-known/assetlinks.json',
      },
    ];
  },
  async headers() {
    return [
      // Your existing headers...

      // Headers for ONLY mobile app specific files
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
        ],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
        ],
      },
    ];
  },
};

// Sentry wraps last so it sees the final webpack config (next-intl included).
// org/project/authToken are read from SENTRY_ORG / SENTRY_PROJECT /
// SENTRY_AUTH_TOKEN; without the token no source maps or releases are
// uploaded and the build stays silent about it.
module.exports = withSentryConfig(withNextIntl(nextConfig), {
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  webpack: {
    // Strip the SDK's own debug logging from the bundles, unless a developer
    // asked for it (SENTRY_DEBUG=true also flips `debug` in Sentry.init).
    treeshake: {removeDebugLogging: process.env.SENTRY_DEBUG !== 'true'},
    automaticVercelMonitors: false,
  },
  // Events go through our own origin so ad blockers cannot drop them. The
  // trailing slash matches `trailingSlash: true`, so the POST is served
  // directly instead of bouncing through Next's 308 redirect.
  tunnelRoute: '/monitoring/',
  sourcemaps: {disable: !process.env.SENTRY_AUTH_TOKEN},
  release: {
    create: Boolean(process.env.SENTRY_AUTH_TOKEN),
    // Must equal `releaseName()` in src/services/logger/sentryOptions.js.
    name: `${name}@${version}`,
  },
});
