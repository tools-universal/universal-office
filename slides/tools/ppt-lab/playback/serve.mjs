// Servidor estático dos relatórios de playback (raiz: slides/) COM suporte a
// Range — o <video> do relatório precisa disso para buscar quadros.
// Uso: node tools/ppt-lab/playback/serve.mjs [porta=8126]
//      → http://127.0.0.1:8126/tools/ppt-lab/results/playback/index.html
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const port = Number(process.argv[2] ?? 8126);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.mp4': 'video/mp4', '.mkv': 'video/x-matroska',
  '.ttf': 'font/ttf', '.ttc': 'font/collection',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!path.startsWith(root)) { res.writeHead(403).end(); return; }
  let file = path;
  let st;
  try {
    st = statSync(file);
    if (st.isDirectory()) { file = join(file, 'index.html'); st = statSync(file); }
  } catch { res.writeHead(404).end('not found'); return; }
  const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
    res.writeHead(206, {
      'content-type': type, 'accept-ranges': 'bytes', 'cache-control': 'no-store',
      'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1,
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': st.size, 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`relatórios de playback em http://127.0.0.1:${port}/tools/ppt-lab/results/playback/index.html`));
