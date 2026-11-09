#!/usr/bin/env node
/**
 * Zero-dependency static server for the editor.
 *
 * `npm run serve` used to shell out to `python -m http.server 8900`, which fails
 * on any machine without Python — and when the port was already taken it failed
 * with a one-line error that is easy to miss, leaving the user looking at a
 * different app that happened to own 8900.
 *
 * This server:
 *   - needs nothing but Node (already required for `npm run build`);
 *   - walks forward from 8900 until it finds a free port, so it never collides;
 *   - prints the exact URL to open;
 *   - sets the MIME types the editor actually loads (`.mjs`, `.mp4`, `.json`…).
 *
 * Usage: node scripts/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const START_PORT = Number(process.argv[2]) || Number(process.env.PORT) || 8900;
const MAX_TRIES = 40;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

function handler(req, res) {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  // Resolve inside ROOT only — `..` must not escape the project directory.
  const target = normalize(join(ROOT, url === '/' ? '/index.html' : url));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  let file = target;
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
       .end('404 ' + url);
    return;
  }
  let size;
  try {
    size = statSync(file).size;
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
       .end('404 ' + url);
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'content-length': size,
    // No caching: this is a dev server, a stale app.js is a debugging trap.
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}

function listen(port, tries) {
  const server = createServer(handler);
  server.on('error', err => {
    if (err.code === 'EADDRINUSE' && tries < MAX_TRIES) {
      listen(port + 1, tries + 1);
      return;
    }
    console.error('serve failed:', err.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    const url = 'http://127.0.0.1:' + port + '/index.html';
    console.log('');
    console.log('  Map Editor  ->  ' + url);
    console.log('');
    console.log('  根目录: ' + ROOT);
    console.log('  Ctrl+C 停止');
    console.log('');
  });
}

listen(START_PORT, 0);
