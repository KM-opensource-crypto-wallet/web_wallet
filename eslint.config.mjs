// ESLint flat config (ESLint 9). Replaces .eslintrc.json now that Next 16 has
// removed `next lint`; run with `yarn lint` (= `eslint .`).
import {defineConfig, globalIgnores} from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
// Registers the prettier plugin and applies eslint-config-prettier so ESLint's
// own formatting rules never fight Prettier.
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  ...nextCoreWebVitals,
  prettierRecommended,
  {
    rules: {
      'prettier/prettier': ['error', {endOfLine: 'auto'}],
      'react-hooks/exhaustive-deps': 'error',
      // eslint-plugin-react-hooks@7 (via eslint-config-next@16) adds the React
      // Compiler rules at their recommended severity. `set-state-in-effect`
      // flags a setState called directly in an effect body (stale first
      // render + cascading re-render). Existing effects in this repo keep
      // their original behaviour and wrap the update in an immediately-
      // invoked anonymous function, which the rule accepts; new code should
      // prefer deriving the value during render or resetting by (re)mounting.
    },
  },
  globalIgnores([
    // Defaults of eslint-config-next (restated because globalIgnores replaces them).
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Repo-specific: build output, the shared blockchain submodule (linted in
    // its own repo), static assets and vendored patches.
    'node_modules/**',
    'dok-wallet-blockchain-networks/**',
    'public/**',
    'patches/**',
    'docs/**',
    '.swc/**',
  ]),
]);
