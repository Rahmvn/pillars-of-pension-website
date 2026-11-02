/* A dependency-free packaging step. It copies approved runtime files without transforms. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const files = require('./static-files.json');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');

// Validate all input paths before touching the disposable output directory.
for (const relative of files) {
  const source = path.resolve(root, relative);
  if (!source.startsWith(root + path.sep) || !fs.statSync(source).isFile()) {
    throw new Error(`Invalid static input: ${relative}`);
  }
}
if (path.resolve(output) !== path.join(root, 'dist') || fs.lstatSync(root).isSymbolicLink()) {
  throw new Error('Build output must remain inside the project.');
}
if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) {
  throw new Error('Refusing to replace a symbolic-link output directory.');
}
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
for (const relative of files) {
  const source = path.join(root, relative);
  const destination = path.join(output, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (digest(source) !== digest(destination)) throw new Error(`Copy verification failed: ${relative}`);
}
console.log(`Prepared ${files.length} unchanged runtime files in dist/. No deployment performed.`);
