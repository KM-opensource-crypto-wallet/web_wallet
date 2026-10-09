// Mirrors Next's static image import: `import icon from './a.png'` yields an
// object with `.src`. A String object is used so the value also works where
// the code passes it straight to <img src>.
const crypto = require('crypto');
const path = require('path');

module.exports = function staticImageLoader(content) {
  const ext = path.extname(this.resourcePath);
  const base = path.basename(this.resourcePath, ext);
  const hash = crypto.createHash('md5').update(content).digest('hex');
  const name = `static/media/${base}.${hash.slice(0, 10)}${ext}`;
  this.emitFile(name, content);
  return [
    `const src = __webpack_public_path__ + ${JSON.stringify(name)};`,
    'const image = new String(src);',
    'image.src = src;',
    'export default image;',
  ].join('\n');
};

module.exports.raw = true;
