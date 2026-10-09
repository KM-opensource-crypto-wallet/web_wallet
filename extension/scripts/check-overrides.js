// Overrides that are full copies of a web wallet file carry the hash of the
// upstream version they were copied from:
//
//   // @override-of src/security/unlockFlow.js sha256:<hex>
//
// When the upstream file changes, the copy is stale and must be re-merged.
// Wrapper overrides (which import `@web-original/...`) carry no marker and
// pick up upstream changes on their own.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {webWalletDir} = require('../extension.config');

const OVERRIDES = path.join(__dirname, '../src/overrides');
const MARKER = /@override-of (\S+) sha256:([0-9a-f]{64})/;

const walk = dir =>
  fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });

const checkOverrides = ({warn = false} = {}) => {
  const stale = [];
  for (const file of walk(OVERRIDES)) {
    const match = fs.readFileSync(file, 'utf8').match(MARKER);
    if (!match) {
      continue;
    }
    const upstream = path.join(webWalletDir, match[1]);
    const actual = fs.existsSync(upstream)
      ? crypto
          .createHash('sha256')
          .update(fs.readFileSync(upstream))
          .digest('hex')
      : 'missing';
    if (actual !== match[2]) {
      stale.push(
        `${path.relative(OVERRIDES, file)} (upstream ${match[1]} changed)`,
      );
    }
  }
  if (stale.length && warn) {
    console.warn(
      `[ext] Overrides out of date with the web wallet; re-merge them:\n  - ${stale.join('\n  - ')}`,
    );
  }
  return stale;
};

if (require.main === module) {
  const stale = checkOverrides();
  if (stale.length) {
    console.error(`Stale overrides:\n  - ${stale.join('\n  - ')}`);
    process.exit(1);
  }
  console.log('All copied overrides match the web wallet.');
}

module.exports = {checkOverrides};
