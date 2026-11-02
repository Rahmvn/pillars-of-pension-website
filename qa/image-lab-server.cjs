/* Local-only image experiment server. Cache policy matches the production-readiness harness. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, 'artifacts/image-lab');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
http.createServer((request, response) => {
  let filename;
  try {
    const url = new URL(request.url, 'http://localhost');
    filename = path.resolve(root, '.' + decodeURIComponent(url.pathname), url.pathname.endsWith('/') ? 'index.html' : '');
  } catch { response.writeHead(400); response.end(); return; }
  if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    response.writeHead(404); response.end('Not found'); return;
  }
  const body = fs.readFileSync(filename);
  const etag = '"' + crypto.createHash('sha256').update(body).digest('hex') + '"';
  response.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
  response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  response.setHeader('ETag', etag);
  if (request.headers['if-none-match'] === etag) { response.writeHead(304); response.end(); return; }
  response.setHeader('Content-Length', body.length);
  response.writeHead(200); response.end(request.method === 'HEAD' ? undefined : body);
}).listen(Number(process.env.PORT || 8082), '127.0.0.1', () => console.log(`Image lab: http://127.0.0.1:${process.env.PORT || 8082}/sites/baseline/`));
