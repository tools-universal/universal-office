// Varre o corpus real (fora do git) atrás de marcas-d'água, cor/efeitos de página
// e folhas de rosto, para medir o que o Word grava nos documentos de verdade.
// Saída detalhada em LAB_DIR/page (fora do git); no console só contagens e a
// ESTRUTURA (atributos VML/estilo), nunca o texto dos documentos.
//   node write/tools/page-lab/corpus-scan.mjs [--limit N]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { loadManifest, LAB_DIR } from '../corpus-lab/corpus.mjs';

const require = createRequire(join(process.cwd(), 'write/packages/docx-core/package.json'));
const { unzipSync, strFromU8 } = require('fflate');

const limit = Number(process.argv[process.argv.indexOf('--limit') + 1]) || Infinity;
const out = join(LAB_DIR, 'page');
mkdirSync(out, { recursive: true });
const docs = loadManifest().filter((d) => d.container === 'zip').slice(0, limit);
const stats = { docs: 0, wmText: 0, wmPict: 0, wmDml: 0, bg: 0, bgFill: 0, dispBg: 0, cover: 0, wmPartsPerDoc: [] };
const detail = [];
const styleKeys = new Map();
const bump = (k) => styleKeys.set(k, (styleKeys.get(k) ?? 0) + 1);

for (const d of docs) {
  let files;
  try { files = unzipSync(readFileSync(d.path), { filter: (f) => /^word\/(document|settings|header\d*)\.xml$|^word\/_rels\/header\d*\.xml\.rels$/.test(f.name) }); } catch { continue; }
  stats.docs++;
  const txt = (n) => (files[n] ? strFromU8(files[n]) : '');
  const doc = txt('word/document.xml');
  const set = txt('word/settings.xml');
  const rec = { id: d.id, path: d.path };
  const bgm = /<w:background\b[\s\S]*?(?:\/>|<\/w:background>)/.exec(doc);
  if (bgm) {
    stats.bg++;
    rec.bg = bgm[0].replace(/\s+id="[^"]*"/g, '');
    if (/<v:background/.test(bgm[0])) { stats.bgFill++; bump(`bgfill ${/type="(\w+)"/.exec(bgm[0])?.[1] ?? 'solid'}`); }
  }
  if (/<w:displayBackgroundShape\b/.test(set)) { stats.dispBg++; rec.dispBg = true; }
  if (/<w:docPartGallery w:val="Cover Pages"/.test(doc)) { stats.cover++; rec.cover = true; }
  const wm = [];
  for (const n of Object.keys(files).filter((f) => /header\d*\.xml$/.test(f))) {
    const h = txt(n);
    for (const m of h.matchAll(/<v:shape\b[^>]*\bid="(PowerPlusWaterMarkObject|WordPictureWatermark)\d*"[^>]*>[\s\S]*?<\/v:shape>/g)) {
      const kind = m[1] === 'WordPictureWatermark' ? 'pict' : 'text';
      const x = m[0];
      const style = /\bstyle="([^"]*)"/.exec(x)?.[1] ?? '';
      const tp = /<v:textpath\b[^>]*>/.exec(x)?.[0] ?? '';
      const fill = /<v:fill\b[^>]*>/.exec(x)?.[0] ?? '';
      const img = /<v:imagedata\b[^>]*>/.exec(x)?.[0] ?? '';
      // estrutura sem o texto: atributos do v:shape (menos o estilo), estilo, fill, textpath sem string
      const attrs = /<v:shape\b([^>]*)>/.exec(x)[1].replace(/\s+style="[^"]*"/, '').replace(/\d{5,}/g, 'N');
      wm.push({ part: n, kind, attrs, style, fill, textpath: tp.replace(/\sstring="[^"]*"/, ' string="…"'), img: img.replace(/r:id="[^"]*"/, 'r:id="…"'), raw: x });
      bump(`${kind} attrs ${attrs}`);
      bump(`${kind} style ${style.replace(/[\d.]+pt/g, 'Npt').replace(/rotation:\d+/, 'rotation:R')}`);
      if (fill) bump(`${kind} fill ${fill}`);
      if (img) bump(`${kind} img ${img.replace(/r:id="[^"]*"/, '').replace(/o:title="[^"]*"/, 'o:title=…')}`);
      if (tp) bump(`${kind} textpath ${tp.replace(/\sstring="[^"]*"/, '').replace(/font-family:&quot;[^&]*&quot;/, 'font-family:F')}`);
    }
    // marca-d'água DrawingML (nome PowerPlusWaterMarkObject num wps)
    if (/<wp:docPr\b[^>]*name="PowerPlusWaterMarkObject/.test(h)) { stats.wmDml++; bump('dml watermark'); }
  }
  if (wm.length) {
    if (wm.some((w) => w.kind === 'text')) stats.wmText++;
    if (wm.some((w) => w.kind === 'pict')) stats.wmPict++;
    stats.wmPartsPerDoc.push(wm.length);
    rec.wm = wm.map(({ raw, ...r }) => r);
    rec.wmRaw = wm.map((w) => w.raw);
  }
  if (rec.bg || rec.wm || rec.cover) detail.push(rec);
}

writeFileSync(join(out, 'scan.json'), JSON.stringify({ stats, detail }, null, 1));
const hist = {};
for (const n of stats.wmPartsPerDoc) hist[n] = (hist[n] ?? 0) + 1;
console.log(JSON.stringify({ ...stats, wmPartsPerDoc: hist }, null, 1));
for (const [k, v] of [...styleKeys].sort((a, b) => b[1] - a[1]).slice(0, 80)) console.log(String(v).padStart(5), k);
console.log(`detalhe: ${join(out, 'scan.json')}`);
