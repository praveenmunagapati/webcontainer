const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webc': 'application/webc',
};

const server = http.createServer((req, res) => {
  const start = Date.now();
  const method = req.method;
  const url = req.url;

  // Extract path and decode URL-encoded components
  let safeUrl = decodeURIComponent(url.split('?')[0]);
  let filePath = path.join(__dirname, safeUrl === '/' ? 'index.html' : safeUrl);

  // Security headers for Cross-Origin Isolation (required for SharedArrayBuffer)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Access-Control-Allow-Origin', '*');

  fs.readFile(filePath, (err, content) => {
    const elapsed = Date.now() - start;
    if (err) {
      if (err.code === 'ENOENT') {
        console.log(`\x1b[31m[404]\x1b[0m ${method} ${url} - File not found (${elapsed}ms)`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        console.log(`\x1b[35m[500]\x1b[0m ${method} ${url} - Server error: ${err.code} (${elapsed}ms)`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Internal Server Error: ${err.code}`);
      }
    } else {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      console.log(`\x1b[32m[200]\x1b[0m ${method} ${url} - ${contentType} (${content.length} bytes, ${elapsed}ms)`);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `Server running at http://localhost:${PORT}/`);
  console.log(`COOP/COEP headers are enabled to allow SharedArrayBuffer compilation.`);
});
