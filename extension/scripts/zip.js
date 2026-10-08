// Packs dist/<brand> into dist/<brand>-<version>.zip for the Chrome Web Store.
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const {brandKey, version} = require('../extension.config');

const dir = path.join(__dirname, '../dist', brandKey);
if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
  throw new Error(`No build in ${dir}. Run \`yarn ext:build\` first.`);
}
if (fs.existsSync(path.join(dir, 'selftest.html'))) {
  throw new Error(
    'This is a development build (selftest.html present). Run `yarn ext:build`.',
  );
}
const zip = path.join(__dirname, '../dist', `${brandKey}-${version}.zip`);
fs.rmSync(zip, {force: true});
execFileSync('zip', ['-qr', zip, '.'], {cwd: dir, stdio: 'inherit'});
console.log(`Wrote ${path.relative(process.cwd(), zip)}`);
