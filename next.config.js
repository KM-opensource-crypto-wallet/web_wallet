/** @type {import('next').NextConfig} */
const CopyPlugin = require('copy-webpack-plugin');
const {version, name} = require('./package.json');
const createNextIntlPlugin = require('next-intl/plugin');
const path = require('path');
const {loadEnvConfig} = require('@next/env');

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
    ETHERSCAN_API_KEY_1: process.env.ETHERSCAN_API_KEY_1,
    ETHERSCAN_API_KEY_2: process.env.ETHERSCAN_API_KEY_2,
    TRON_API_KEY_1: process.env.TRON_API_KEY_1,
    TRON_API_KEY_2: process.env.TRON_API_KEY_2,
    TRON_SCAN_API_KEY: process.env.TRON_SCAN_API_KEY,
    BLOCK_CYPHER_API_KEY: process.env.BLOCK_CYPHER_API_KEY,
    DOK_WALLET_BASE_URL: process.env.DOK_WALLET_BASE_URL,
    COIN_MARKET_CAP_API_KEY_1: process.env.COIN_MARKET_CAP_API_KEY_1,
    COIN_MARKET_CAP_API_KEY_2: process.env.COIN_MARKET_CAP_API_KEY_2,
    COIN_MARKET_CAP_API_KEY_3: process.env.COIN_MARKET_CAP_API_KEY_3,
    COIN_MARKET_CAP_API_KEY_4: process.env.COIN_MARKET_CAP_API_KEY_4,
    MORALIS_API_KEY: process.env.MORALIS_API_KEY,
    TON_SCAN_API_KEY: process.env.TON_SCAN_API_KEY,
    ETHEREUM_POW_SCAN_API_KEY: process.env.ETHEREUM_POW_SCAN_API_KEY,
    POLKADOT_SCAN_API_KEY: process.env.POLKADOT_SCAN_API_KEY,
    COSMOS_API_KEY: process.env.COSMOS_API_KEY,
    SOLANA_RPC_KEY: process.env.SOLANA_RPC_KEY,
    REDUX_WEB_KEY: process.env.REDUX_WEB_KEY,
    BLOCKDAEMON_API_KEY: process.env.BLOCKDAEMON_API_KEY,
    WALLET_CONNECT_ID: process.env.WALLET_CONNECT_ID,
    BLOCKFROST_API_KEY: process.env.BLOCKFROST_API_KEY,
    BREEZ_API_KEY: process.env.BREEZ_API_KEY,
    NEXT_PUBLIC_BUGFENDER_APP_KEY: process.env.NEXT_PUBLIC_BUGFENDER_APP_KEY,
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

module.exports = withNextIntl(nextConfig);
