// Servidor estatico de dev (raiz do projeto slides) na porta 8125.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!path.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const st = statSync(path);
    const file = st.isDirectory() ? join(path, 'index.html') : path;
    statSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end('not found'); }
}).listen(8125, '127.0.0.1', () => console.log('dev-server slides em http://127.0.0.1:8125'));
