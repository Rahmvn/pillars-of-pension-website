/* Local artifact preview and conditional-request test harness; not a Vercel/CDN emulator. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const files = require('../scripts/static-files.json');
const config = require('../vercel.json');
const root = path.resolve(__dirname, '../dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const content = new Map(files.map(file => {
  const body = fs.readFileSync(path.join(root, file));
  const etag = '"' + crypto.createHash('sha256').update(body).digest('hex') + '"';
  return ['/' + file, { body, etag, type: types[path.extname(file)] }];
}));
http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400); response.end(); return; }
  const resource = content.get(pathname === '/' ? '/index.html' : pathname);
  if (!resource || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404, { 'Cache-Control': 'no-store' }); response.end('Not found'); return;
  }
  for (const rule of config.headers) {
    if (rule.source !== '/(.*)') throw new Error('Preview server only supports the configured catch-all header rule.');
    for (const header of rule.headers) response.setHeader(header.key, header.value);
  }
  response.setHeader('ETag', resource.etag);
  response.setHeader('Content-Type', resource.type);
  if (request.headers['if-none-match'] === resource.etag) {
    response.writeHead(304); response.end(); return;
  }
  response.setHeader('Content-Length', resource.body.length);
  response.writeHead(200);
  response.end(request.method === 'HEAD' ? undefined : resource.body);
}).listen(Number(process.env.PORT || 8080), '127.0.0.1', () => console.log(`Static dist/ preview: http://127.0.0.1:${process.env.PORT || 8080}`));
