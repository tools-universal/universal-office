// Servidor de dev: estático (raiz do repo) + PUT /__save?path=rel para o
// harness de pixel-diff gravar PNGs capturados do canvas.
import { createServer } from 'node:http';
import { createReadStream, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'PUT' && url.pathname === '/__save') {
    const rel = url.searchParams.get('path') ?? '';
    const target = normalize(join(root, rel));
    if (!target.startsWith(root) || !/\.(png|json|xlsx|pdf)$/.test(target)) { res.writeHead(403).end(); return; }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      // dataURL (png/json via canvas) ou bytes crus (xlsx)
      const head = body.subarray(0, 5).toString('utf8');
      const data = head.startsWith('data:')
        ? Buffer.from(body.toString('utf8').split(',')[1], 'base64')
        : body;
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, data);
      res.writeHead(200, { 'access-control-allow-origin': '*' }).end('ok');
    });
    return;
  }
  const path = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!path.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const st = statSync(path);
    const file = st.isDirectory() ? join(path, 'index.html') : path;
    statSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end('not found');
  }
});
server.listen(8124, '127.0.0.1', () => console.log('dev-server em http://127.0.0.1:8124'));
