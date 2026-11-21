import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../docs', import.meta.url));
const port = Number(process.argv[2] ?? 8080);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json'],
  ['.ttf', 'font/ttf'],
]);

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    // Also serve the GitHub Pages project subpath for local verification.
    const path = decodeURIComponent(url.pathname).replace(/^\/krillion\//u, '/');
    const filename = resolve(root, `.${path === '/' ? '/index.html' : path}`);
    if (!filename.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const file = await stat(filename);
    if (!file.isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': types.get(extname(filename)) ?? 'application/octet-stream',
      'Content-Length': file.size,
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(filename).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Krillion is running at http://127.0.0.1:${port}/krillion/`);
});
