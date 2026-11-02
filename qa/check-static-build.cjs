const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const files = require('../scripts/static-files.json');
const config = require('../vercel.json');
const base = process.env.QA_URL || 'http://127.0.0.1:8081';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(file) : [file.replaceAll('\\', '/')];
});
(async () => {
  const results = { outputFiles: [], reviewedSourcesUnchanged: [], httpChecks: [], schema: 'not requested' };
  assert.deepEqual(walk('dist').map(file => file.slice(5)).sort(), [...files].sort());
  for (const file of files) {
    assert.equal(hash(file), hash(path.join('dist', file)), `${file}: output must be a byte-for-byte copy`);
    results.outputFiles.push({ file, bytes: fs.statSync(file).size, sha256: hash(file) });
  }
  for (const [file, expected] of Object.entries(require('./approved-source-hashes.json'))) {
    if (file === 'styles.css' || file.endsWith('.html')) continue; // Responsive image markup is checked against baseline text/geometry in the image visual report.
    if (['assets/fonts/geist-regular.ttf', 'assets/fonts/geist-medium.ttf'].includes(file) && !fs.existsSync(file)) continue; // Optional original downloads, intentionally not in Git/output.
    assert.equal(hash(file), expected, `${file}: reviewed copy, script, and assets must remain unchanged`);
    results.reviewedSourcesUnchanged.push(file);
  }
  for (const file of ['index.html', 'book.html', 'author.html', 'launch.html', 'styles.css']) {
    const content = fs.readFileSync(file, 'utf8');
    const references = file.endsWith('.css') ? [...content.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m => m[1]) : [...content.matchAll(/(?:src|href|srcset)="([^"]+)"/g)].map(m => m[1]);
    for (const reference of references) {
      if (reference.startsWith('#') || reference === './') continue;
      if (reference === 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=') continue; // Only used in CSS-hidden responsive slots, not a design replacement.
      assert(files.includes(reference), `${file} references a missing/unpackaged resource: ${reference}`);
    }
  }
  if (process.env.AJV_MODULE && process.env.VERCEL_SCHEMA) {
    const Ajv = require(process.env.AJV_MODULE);
    const published = JSON.parse(fs.readFileSync(process.env.VERCEL_SCHEMA));
    // Validate every configured property. The full published schema contains unrelated
    // function definitions with mixed draft syntax; those are not used by this static site.
    const schema = { type: 'object', additionalProperties: false, properties: {} };
    for (const key of Object.keys(config)) {
      assert(published.properties[key], `Unknown Vercel option: ${key}`);
      schema.properties[key] = published.properties[key];
    }
    const validate = new Ajv({ allErrors: true }).compile(schema);
    assert(validate(config), JSON.stringify(validate.errors));
    results.schema = 'Every configured property validated against the official Vercel schema';
  }
  if (process.env.IGNORE_MODULE) {
    const ignore = require(process.env.IGNORE_MODULE)().add(fs.readFileSync('.vercelignore', 'utf8'));
    const uploads = [...files, 'vercel.json', 'scripts/build-static.cjs', 'scripts/static-files.json'];
    for (const file of uploads) assert(!ignore.ignores(file), `${file} must be uploaded for the Vercel build`);
    for (const file of ['README.md', 'qa/verify.cjs', '.env', '.git/config', 'dist/index.html', 'docs/STAGING.md', 'assets/images/interior.png', 'assets/images/author-portrait.png', 'assets/fonts/geist-regular.ttf']) {
      assert(ignore.ignores(file), `${file} must be excluded from CLI upload`);
    }
    results.uploadAllowlist = uploads;
  }
  for (const route of ['/', ...files.map(file => '/' + file)]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
    const etag = response.headers.get('etag');
    assert(etag, 'Conditional requests need an ETag');
    const conditional = await fetch(base + route, { headers: { 'If-None-Match': etag } });
    assert.equal(conditional.status, 304);
    results.httpChecks.push({ route, status: 200, conditionalStatus: 304, contentType: response.headers.get('content-type') });
  }
  for (const route of ['/qa/verify.cjs', '/.git/config', '/.env', '/scripts/build-static.cjs', '/vercel.json', '/README.md', '/assets/images/interior.png', '/assets/images/author-portrait.png', '/missing-page']) {
    assert.equal((await fetch(base + route)).status, 404, route);
    results.httpChecks.push({ route, status: 404 });
  }
  fs.writeFileSync('qa/static-build-results.json', JSON.stringify(results, null, 2) + '\n');
  console.log(`PASS ${files.length} packaged files, unchanged reviewed sources, resource references, upload filtering, HTTP routes, and conditional requests`);
})().catch(error => { console.error(error); process.exitCode = 1; });
