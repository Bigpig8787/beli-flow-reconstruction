import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { journalConfig, vendorFiles } from './journal-config.mjs';

const host = '127.0.0.1';
const port = Number(process.env.PORT ?? 8766);
const files = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/fomery-wordmark.svg': ['fomery-wordmark.svg', 'image/svg+xml'],
  '/meal-photos/curry-portrait.jpg': ['meal-photos/curry-portrait.jpg', 'image/jpeg'],
  '/demo.html': ['demo.html', 'text/html'],
  '/journal.mjs': ['journal.mjs', 'text/javascript'],
  '/journal-data.mjs': ['journal-data.mjs', 'text/javascript'],
  '/journal-media.mjs': ['journal-media.mjs', 'text/javascript'],
  '/meal-reader.mjs': ['meal-reader.mjs', 'text/javascript'],
  '/journal.css': ['journal.css', 'text/css'],
  '/app.mjs': ['app.mjs', 'text/javascript'],
  '/catalog.mjs': ['catalog.mjs', 'text/javascript'],
  '/ranking.mjs': ['ranking.mjs', 'text/javascript'],
  '/social.mjs': ['social.mjs', 'text/javascript'],
  '/social-ui.mjs': ['social-ui.mjs', 'text/javascript'],
  '/photos.mjs': ['photos.mjs', 'text/javascript'],
  '/photo-ui.mjs': ['photo-ui.mjs', 'text/javascript'],
  '/maps.mjs': ['maps.mjs', 'text/javascript'],
  '/styles.css': ['styles.css', 'text/css'],
  '/ui-options.html': ['ui-options.html', 'text/html'],
  '/ui-preview.css': ['ui-preview.css', 'text/css'],
  '/record.css': ['record.css', 'text/css'],
  '/ui-preview.mjs': ['ui-preview.mjs', 'text/javascript'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
  '/sw.js': ['sw.js', 'text/javascript'],
  '/icons/icon-192.png': ['icons/icon-192.png', 'image/png'],
  '/icons/icon-512.png': ['icons/icon-512.png', 'image/png'],
  '/icons/apple-touch-icon.png': ['icons/apple-touch-icon.png', 'image/png'],
};
for (const id of [4, 7, 9, 10, 12, 13, 14, 16]) {
  files[`/preview-photos/${id}.jpg`] = [`preview-photos/${id}.jpg`, 'image/jpeg'];
}
for (let id = 1; id <= 10; id++) {
  files[`/meal-photos/${id}.jpg`] = [`meal-photos/${id}.jpg`, 'image/jpeg'];
}
for (const [name, source] of Object.entries(vendorFiles)) files['/' + name] = [source, 'text/javascript'];
const config = JSON.stringify(journalConfig());

const server = createServer(async (request, response) => {
  const pathname = request.url.split('?', 1)[0];
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return response.writeHead(405, { Allow: 'GET, HEAD' }).end();
  }
  if (pathname === '/journal-config.json') {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return response.end(request.method === 'HEAD' ? undefined : config);
  }
  if (!Object.hasOwn(files, pathname)) return response.writeHead(404).end();
  const [name, type] = files[pathname];
  try {
    const body = await readFile(new URL(name, import.meta.url));
    response.writeHead(200, { 'Content-Type': type.startsWith('text/') ? type + '; charset=utf-8' : type, 'Content-Length': body.length });
    return response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    return response.writeHead(500).end('Unable to load the local file.');
  }
});

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'Port ' + port + ' is already in use.' : error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => console.log('Open http://' + host + ':' + port));
