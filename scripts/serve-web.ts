import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeliveryConfig } from '../src/config';
import { configScript } from '../src/page-config';

const config = loadDeliveryConfig();
const WEB_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
const port = Number(process.env.WEB_PORT) || 4173;

// Only these files are served, so no request can reach anything else on disk.
const FONT = 'font/woff2';
const FILES: Record<string, [string, string]> = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/fonts/archivo.woff2': ['fonts/archivo.woff2', FONT],
  '/fonts/bigshouldersdisplay.woff2': ['fonts/bigshouldersdisplay.woff2', FONT],
  '/fonts/jetbrainsmono.woff2': ['fonts/jetbrainsmono.woff2', FONT],
};
const HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'self'; connect-src 'self' https://cdn.contentful.com; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'",
};

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (req.method !== 'GET') {
      res.writeHead(405, HEADERS).end('Method not allowed');
      return;
    }
    if (pathname === '/config.js') {
      res.writeHead(200, { ...HEADERS, 'content-type': 'text/javascript; charset=utf-8' }).end(configScript(config));
      return;
    }
    const file = FILES[pathname];
    if (!file) {
      res.writeHead(404, HEADERS).end('Not found');
      return;
    }
    const headers = { ...HEADERS, 'content-type': file[1], ...(file[1] === FONT && { 'cache-control': 'public, max-age=86400' }) };
    res.writeHead(200, headers).end(await readFile(path.join(WEB_DIR, file[0])));
  })
  .listen(port, '127.0.0.1', () => console.log(`Serving the page on http://127.0.0.1:${port}`));
