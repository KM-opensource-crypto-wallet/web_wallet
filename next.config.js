/** @type {import('next').NextConfig} */
const CopyPlugin = require('copy-webpack-plugin');
const {version, name} = require('./package.json');
const createNextIntlPlugin = require('next-intl/plugin');
const path = require('path');
const {loadEnvConfig} = require('@next/env');
const {withSentryConfig} = require('@sentry/nextjs/config');

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const withNextIntl = createNextIntlPlugin();
const nextConfig = {
  serverExternalPackages: ['bitcore-lib'],
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
  },
  trailingSlash: true,
  reactStrictMode: false,
  webpack: (config, {isServer, dev}) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.alias = {
      ...config.resolve.alias,
      tls: path.resolve('./node_modules/tls-browserify'),
      net: path.resolve('./node_modules/net-browserify'),
      http2: path.resolve('./node_modules/http-browserify'),
      http: path.resolve('./node_modules/http-browserify'),
      dns: path.resolve('./node_modules/@i2labs/dns'),
      fs: path.resolve('./node_modules/bare-fs'),
    };
    if (isServer) {
      if (!dev) {
        config.plugins.push(
          new CopyPlugin({
            patterns: [
              {
                context: '.next/server',
                to: './chunks/[name][ext]',
                from: '../../node_modules/@xmtp/user-preferences-bindings-wasm/dist/node',
                filter: resourcePath => resourcePath.endsWith('.wasm'),
              },
            ],
          }),
        );
      } else {
        config.plugins.push(
          new CopyPlugin({
            patterns: [
              {
                context: '.next/server',
                to: './vendor-chunks/[name][ext]',
                from: '../../node_modules/@xmtp/user-preferences-bindings-wasm/dist/node',
                filter: resourcePath => resourcePath.endsWith('.wasm'),
              },
            ],
          }),
        );
      }
    }
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
  async redirects() {
    return [
      {
        source: '/buy-crypto',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/buy-crypto/otc2',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/coin-sync',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/confirm-batch',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/confirm-staking',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/create-staking',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/send/custom-derivation',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/send/receive-funds',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/send/select-UTXOs',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/send/send-funds/transfer',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/staking-list',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/transactions',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/transactions/update-transaction',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/vote-staking',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/home/withdraw-staking',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/manage-coins',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/sell-crypto',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/sell-crypto/confirm',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/swap',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/swap/confirm',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/swap/history',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/verify/verify-create',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/verify/verify-screen',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/wallet-connect',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/wallets/hide-wallet',
        destination: '/home',
        permanent: false,
      },
    ];
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
