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
    DOK_WALLET_BASE_URL: process.env.DOK_WALLET_BASE_URL,
    REDUX_WEB_KEY: process.env.REDUX_WEB_KEY,
    WALLET_CONNECT_ID: process.env.WALLET_CONNECT_ID,
    BREEZ_API_KEY: process.env.BREEZ_API_KEY,
    NEXT_PUBLIC_BUGFENDER_APP_KEY: process.env.NEXT_PUBLIC_BUGFENDER_APP_KEY,
    ENV_MODE: process.env.ENV_MODE,
    SPONSOR_TREASURY_ADDRESS: process.env.SPONSOR_TREASURY_ADDRESS,
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
