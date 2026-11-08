import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const host = '127.0.0.1';
const port = 8766;
const files = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/app.mjs': ['app.mjs', 'text/javascript'],
  '/catalog.mjs': ['catalog.mjs', 'text/javascript'],
  '/ranking.mjs': ['ranking.mjs', 'text/javascript'],
  '/maps.mjs': ['maps.mjs', 'text/javascript'],
  '/styles.css': ['styles.css', 'text/css'],
};

const server = createServer(async (request, response) => {
  const pathname = request.url.split('?', 1)[0];
  if (!Object.hasOwn(files, pathname)) return response.writeHead(404).end();
  const asset = files[pathname];
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return response.writeHead(405, { Allow: 'GET, HEAD' }).end();
  }
  const [name, type] = asset;
  try {
    const body = await readFile(new URL(name, import.meta.url));
    response.writeHead(200, { 'Content-Type': type + '; charset=utf-8', 'Content-Length': body.length });
    return response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    return response.writeHead(500).end('Unable to load the local file.');
  }
});

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'Port 8766 is already in use.' : error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => console.log('Open http://' + host + ':' + port));
