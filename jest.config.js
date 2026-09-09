const nextJest = require('next/jest');

// next/jest gives us the app's own SWC transform, so no babel config is added
// at the repo root -- a root babel.config.js would switch the whole Next build
// off SWC. It also loads .env and ignores node_modules/.next for us.
const createJestConfig = nextJest({dir: './'});

/** @type {import('jest').Config} */
const config = {
  // These suites exercise pure service logic, not React trees.
  testEnvironment: 'node',
  // This app's tests, plus the shared submodule's service/ and helper/ suites.
  // Those became runnable here once the Electrum transport moved into
  // utils/electrumTransport: nothing under those two directories reaches for a
  // React Native module any more. cryptoChain/ and redux/ are still excluded --
  // they need RN mocks (tronweb interop, the native crypto shim) that only the
  // mobile app provides.
  roots: [
    '<rootDir>/src',
    '<rootDir>/dok-wallet-blockchain-networks/service',
    '<rootDir>/dok-wallet-blockchain-networks/helper',
  ],
  // services/logger imports @sentry/nextjs, which needs a browser/Node runtime
  // the tests do not have; jest.setup.js stubs the SDK surface.
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Mirrors the "paths" map in jsconfig.json.
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^dok-wallet-blockchain-networks/(.*)$':
      '<rootDir>/dok-wallet-blockchain-networks/$1',
    '^app/(.*)$': '<rootDir>/src/app/$1',
    '^assets/(.*)$': '<rootDir>/src/assets/$1',
    '^components/(.*)$': '<rootDir>/src/components/$1',
    '^data/(.*)$': '<rootDir>/src/data/$1',
    '^pages/(.*)$': '<rootDir>/src/pages/$1',
    '^redux/(.*)$': '<rootDir>/src/redux/$1',
    '^services/(.*)$': '<rootDir>/src/services/$1',
    '^whitelabel/(.*)$': '<rootDir>/src/whitelabel/$1',
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
    '^myWallet/(.*)$': '<rootDir>/src/myWallet/$1',
    '^theme/(.*)$': '<rootDir>/src/theme/$1',
  },
};

module.exports = createJestConfig(config);
