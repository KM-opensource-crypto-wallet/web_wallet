// Builds the extension from the web wallet sources.
//
// The web wallet (Next.js) is compiled as-is. Three mechanisms make it run as
// an extension without editing it:
//   1. Shims (src/shims): stand-ins for next/*, next-auth/react, @sentry/nextjs,
//      reCAPTCHA and GA, aliased in place of the real packages.
//   2. Overrides (src/overrides): a file at src/overrides/<path> replaces
//      <webWalletDir>/<path> wherever it is imported from (alias or relative
//      import). An override reaches the file it replaces through the
//      `@web-original/<path>` prefix.
//   3. The route table (scripts/generate-routes.js), generated from src/app.
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const {brand, brandKey, version, webWalletDir} = require('./extension.config');
const {generateRoutes} = require('./scripts/generate-routes');
const {buildManifest} = require('./scripts/manifest');
const {checkOverrides} = require('./scripts/check-overrides');

const ROOT = __dirname;
const WEB = webWalletDir;
const WEB_SRC = path.join(WEB, 'src');
const SUBMODULE = path.join(WEB, 'dok-wallet-blockchain-networks');
const WEB_MODULES = path.join(WEB, 'node_modules');
const OVERRIDES = path.join(ROOT, 'src/overrides');
const SHIMS = path.join(ROOT, 'src/shims');
const GENERATED = path.join(ROOT, '.generated');
const ORIGINAL_PREFIX = '@web-original/';

if (!fs.existsSync(path.join(WEB_MODULES, 'next'))) {
  throw new Error(
    `Dependencies not found in ${WEB_MODULES}. Run \`yarn install\` in ${WEB}.`,
  );
}
if (!fs.existsSync(path.join(SUBMODULE, 'security'))) {
  throw new Error(
    `Submodule missing at ${SUBMODULE}. Run \`git submodule update --init\` in ${WEB}.`,
  );
}

// Web wallet .env first (shared API settings), then this repo's .env, then the
// real environment, each one winning over the previous.
const env = {
  ...dotenv.config({path: path.join(WEB, '.env'), processEnv: {}}).parsed,
  ...dotenv.config({path: path.join(ROOT, '.env'), processEnv: {}}).parsed,
  ...process.env,
};

const webPackage = require(path.join(WEB, 'package.json'));

// Same client-visible variables as the web build (next.config.js `env` plus
// NEXT_PUBLIC_*). APP_NAME stays the web package name: the submodule keys
// `isWeb` off it, and the extension must behave like the web client.
const clientEnv = mode => ({
  NODE_ENV: mode,
  APP_VERSION: version,
  APP_NAME: webPackage.name,
  DOK_WALLET_BASE_URL: env.DOK_WALLET_BASE_URL,
  ATTEST_WORKER_BASE_URL: env.ATTEST_WORKER_BASE_URL,
  REDUX_WEB_KEY: env.REDUX_WEB_KEY,
  WALLET_CONNECT_ID: env[brand.walletConnectIdEnv] || env.WALLET_CONNECT_ID,
  BREEZ_API_KEY: env.BREEZ_API_KEY,
  NEXT_PUBLIC_SENTRY_DSN: env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  NEXT_PUBLIC_APP_URL: brand.websiteUrl,
  SENTRY_ENABLE_IN_DEV: env.SENTRY_ENABLE_IN_DEV,
  SENTRY_DEV_TOOLS: env.SENTRY_DEV_TOOLS,
  SENTRY_DEBUG: env.SENTRY_DEBUG,
  ENV_MODE: env.ENV_MODE,
  // Extension-only settings (see .env.example).
  EXT_BRAND: brandKey,
  EXT_BRAND_NAME: brand.name,
  EXT_WHITE_LABEL_DOMAIN: brand.whiteLabelDomain,
  EXT_WEBSITE_URL: brand.websiteUrl,
  EXT_GOOGLE_CLIENT_ID: env[brand.googleClientIdEnv],
  EXT_WALLET_BACKUP_SECRET: env.WALLET_BACKUP_SECRET,
  EXT_ELECTRUM_BRIDGE_URL: env.ELECTRUM_BRIDGE_URL,
  EXT_APP_NAME_SUFFIX: env.EXT_APP_NAME_SUFFIX,
});

const defineEnv = mode =>
  Object.fromEntries(
    Object.entries(clientEnv(mode)).map(([key, value]) => [
      `process.env.${key}`,
      JSON.stringify(value ?? undefined),
    ]),
  );

// jsconfig.json maps `utils/*`, `redux/*`, ... onto src/. Webpack aliases
// match a bare name too, and `redux` must keep meaning the npm package, so
// each top-level entry gets its own alias (`redux/store`, `redux/storage`).
const jsconfigAliases = () => {
  const jsconfig = JSON.parse(
    fs.readFileSync(path.join(WEB, 'jsconfig.json'), 'utf8'),
  );
  const aliases = {};
  for (const [pattern, [target]] of Object.entries(
    jsconfig.compilerOptions.paths,
  )) {
    const prefix = pattern.replace(/\/\*$/, '');
    // `@ext/*` is listed for editors; the build aliases it itself.
    if (prefix.startsWith('@')) {
      continue;
    }
    const dir = path.join(WEB, target.replace(/\/\*$/, ''));
    if (!fs.existsSync(dir)) {
      continue;
    }
    if (prefix === 'dok-wallet-blockchain-networks') {
      aliases[prefix] = dir;
      continue;
    }
    for (const entry of fs.readdirSync(dir)) {
      const name = entry.replace(/\.(jsx?|mjs)$/, '');
      aliases[`${prefix}/${name}`] = path.join(dir, entry);
    }
  }
  return aliases;
};

const shim = file => path.join(SHIMS, file);

const resolveConfig = {
  extensions: ['.js', '.jsx', '.mjs', '.json'],
  // Extension code first, then the web wallet's dependencies, so both halves
  // of the app share one copy of every package.
  modules: ['node_modules', WEB_MODULES],
  alias: {
    ...jsconfigAliases(),
    [ORIGINAL_PREFIX.slice(0, -1)]: WEB,
    '@ext': path.join(ROOT, 'src'),
    '@generated': GENERATED,
    react: path.join(WEB_MODULES, 'react'),
    'react-dom': path.join(WEB_MODULES, 'react-dom'),
    // Next.js runtime -> extension shims.
    'next/navigation$': shim('next/navigation.js'),
    'next/link$': shim('next/link.jsx'),
    'next/image$': shim('next/image.jsx'),
    'next/font/google$': shim('next/font-google.js'),
    'next/headers$': shim('next/headers.js'),
    'next-auth/react$': shim('next-auth-react.js'),
    '@sentry/nextjs$': shim('sentry.js'),
    'react-ga4$': shim('react-ga4.js'),
    'react-google-recaptcha-v3$': shim('recaptcha.jsx'),
    // From next.config.js.
    tls: path.join(WEB_MODULES, 'tls-browserify'),
    net: path.join(WEB_MODULES, 'net-browserify'),
    http2: path.join(WEB_MODULES, 'http-browserify'),
    dns: path.join(WEB_MODULES, '@i2labs/dns'),
    fs: false,
    'sodium-native': false,
    'pino-pretty': false,
    lokijs: false,
    encoding: false,
  },
  // The polyfills Next gives a browser build.
  fallback: Object.fromEntries(
    Object.entries({
      assert: 'assert',
      buffer: 'buffer',
      constants: 'constants-browserify',
      crypto: 'crypto-browserify',
      domain: 'domain-browser',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      path: 'path-browserify',
      punycode: 'punycode',
      querystring: 'querystring-es3',
      stream: 'stream-browserify',
      string_decoder: 'string_decoder',
      sys: 'util',
      timers: 'timers-browserify',
      tty: 'tty-browserify',
      util: 'util',
      vm: 'vm-browserify',
      zlib: 'browserify-zlib',
      events: 'events',
      url: 'native-url',
      setImmediate: 'setimmediate',
    }).map(([name, pkg]) => [
      name,
      path.join(WEB_MODULES, 'next/dist/compiled', pkg),
    ]),
  ),
};

// Swaps a resolved web wallet file for its override, if one exists.
class OverridePlugin {
  apply(compiler) {
    compiler.hooks.normalModuleFactory.tap('OverridePlugin', factory => {
      factory.hooks.afterResolve.tap('OverridePlugin', resolveData => {
        const data = resolveData.createData;
        const resource = data?.resource;
        if (!resource || resolveData.request.startsWith(ORIGINAL_PREFIX)) {
          return;
        }
        const [file, query = ''] = resource.split('?');
        if (
          !file.startsWith(WEB + path.sep) ||
          file.startsWith(ROOT + path.sep) ||
          file.includes('node_modules')
        ) {
          return;
        }
        const override = path.join(OVERRIDES, path.relative(WEB, file));
        if (fs.existsSync(override)) {
          data.resource = query ? `${override}?${query}` : override;
          data.userRequest = override;
          data.request = data.request.replace(file, override);
        }
      });
    });
  }
}

// Transpiled with SWC like Next does; JSX is allowed in .js files.
const swcRule = mode => ({
  test: /\.(jsx?|mjs)$/,
  include: [WEB_SRC, SUBMODULE, path.join(ROOT, 'src'), GENERATED],
  use: {
    loader: 'swc-loader',
    options: {
      jsc: {
        parser: {syntax: 'ecmascript', jsx: true},
        transform: {
          react: {
            runtime: 'automatic',
            development: mode === 'development',
          },
        },
        target: 'es2022',
      },
    },
  },
});

const optimization = mode => ({
  minimize: mode === 'production',
  minimizer: [
    new TerserPlugin({
      minify: TerserPlugin.swcMinify,
      terserOptions: {compress: true, mangle: true},
    }),
  ],
});

const common = mode => ({
  mode,
  context: ROOT,
  // eval-based source maps break under the extension CSP.
  devtool: mode === 'development' ? 'cheap-module-source-map' : false,
  resolve: resolveConfig,
  resolveLoader: {modules: ['node_modules', WEB_MODULES]},
  performance: {hints: false},
  stats: 'errors-warnings',
  infrastructureLogging: {level: 'error'},
});

const outDir = path.join(ROOT, 'dist', brandKey);

// Config functions run before either compiler starts, so this empties the
// output exactly once per build.
fs.rmSync(outDir, {recursive: true, force: true});

const appConfig = (_, argv) => {
  const mode = argv.mode || 'production';
  const count = generateRoutes({
    appDir: path.join(WEB_SRC, 'app'),
    outFile: path.join(GENERATED, 'routes.js'),
  });
  checkOverrides({warn: true});
  console.log(`[ext] ${brand.name}: ${count} routes from ${WEB_SRC}/app`);

  return {
    ...common(mode),
    name: 'app',
    target: 'web',
    entry: {
      app: './src/app/main.jsx',
      ...(mode === 'development'
        ? {selftest: './src/selftest/selftest.js'}
        : {}),
    },
    output: {
      path: outDir,
      filename: '[name].js',
      chunkFilename: 'chunks/[name].[contenthash:8].js',
      assetModuleFilename: 'static/media/[name].[hash:8][ext]',
      publicPath: '/',
      // Both configs write to outDir, which is emptied once up front.
      clean: false,
    },
    experiments: {asyncWebAssembly: true, topLevelAwait: true},
    module: {
      rules: [
        {test: /\.m?js$/, resolve: {fullySpecified: false}},
        swcRule(mode),
        {
          test: /\.module\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                modules: {
                  localIdentName: '[name]__[local]__[hash:base64:5]',
                  namedExport: false,
                  exportLocalsConvention: 'as-is',
                },
              },
            },
          ],
        },
        {
          test: /\.css$/,
          exclude: /\.module\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        {
          test: /\.svg$/,
          issuer: /\.(jsx?|mjs)$/,
          use: ['@svgr/webpack'],
        },
        {
          test: /\.(png|jpe?g|gif|webp|avif|ico|bmp)$/i,
          issuer: /\.(jsx?|mjs)$/,
          use: [path.join(ROOT, 'scripts/static-image-loader.js')],
        },
        {
          test: /\.(png|jpe?g|gif|webp|avif|ico|bmp|svg|woff2?|ttf|otf|eot)$/i,
          issuer: {not: /\.(jsx?|mjs)$/},
          type: 'asset/resource',
        },
        {test: /\.(woff2?|ttf|otf|eot|mp4|webm|pdf)$/i, type: 'asset/resource'},
      ],
    },
    plugins: [
      new OverridePlugin(),
      new webpack.DefinePlugin(defineEnv(mode)),
      new webpack.ProvidePlugin({
        Buffer: [path.join(WEB_MODULES, 'buffer'), 'Buffer'],
        process: path.join(WEB_MODULES, 'process/browser.js'),
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: 'chunks/[name].[contenthash:8].css',
      }),
      new HtmlWebpackPlugin({
        template: './src/app/app.html',
        filename: 'app.html',
        chunks: ['app'],
        title: brand.name,
      }),
      ...(mode === 'development'
        ? [
            new HtmlWebpackPlugin({
              template: './src/selftest/selftest.html',
              filename: 'selftest.html',
              chunks: ['selftest'],
              inject: 'body',
            }),
          ]
        : []),
      new CopyWebpackPlugin({
        patterns: [
          // Absolute `/images/...` URLs in the web wallet resolve to the
          // extension root, as they do on the web origin.
          {from: path.join(WEB, 'public'), to: outDir},
          {
            from: path.join(ROOT, brand.iconDir),
            to: path.join(outDir, 'icons'),
          },
          {
            from: path.join(ROOT, 'src/manifest.json'),
            to: path.join(outDir, 'manifest.json'),
            transform: content =>
              JSON.stringify(
                buildManifest(JSON.parse(content), {
                  brand,
                  version,
                  env: clientEnv(mode),
                }),
                null,
                2,
              ),
          },
        ],
      }),
    ],
    optimization: optimization(mode),
  };
};

// The service worker is a classic script with no DOM and no chunk loading.
const backgroundConfig = (_, argv) => {
  const mode = argv.mode || 'production';
  return {
    ...common(mode),
    name: 'background',
    target: 'webworker',
    entry: {background: './src/background/service-worker.js'},
    output: {
      path: outDir,
      filename: '[name].js',
      clean: false,
    },
    module: {rules: [swcRule(mode)]},
    plugins: [new webpack.DefinePlugin(defineEnv(mode))],
    optimization: {...optimization(mode), splitChunks: false},
  };
};

module.exports = [appConfig, backgroundConfig];
