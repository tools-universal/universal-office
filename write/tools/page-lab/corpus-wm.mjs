// Marca-d'água nos documentos reais (saída do diálogo do Word): como se distribui
// pelas seções/tipos de cabeçalho, se vem num sdt "Watermarks", e o tamanho de
// imagem/texto contra a área útil da página. Só números e estrutura no console.
//   node write/tools/page-lab/corpus-wm.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { LAB_DIR } from '../corpus-lab/corpus.mjs';

const require = createRequire(join(process.cwd(), 'write/packages/docx-core/package.json'));
const { unzipSync, strFromU8 } = require('fflate');
const scan = JSON.parse(readFileSync(join(LAB_DIR, 'page', 'scan.json'), 'utf8'));

const pngSize = (b) => (b[0] === 0x89 ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null);
function jpgSize(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}
const dpiPng = (b) => {
  const i = b.indexOf('pHYs');
  if (i < 0) return null;
  const x = b.readUInt32BE(i + 4), unit = b[i + 12];
  return unit === 1 ? Math.round(x * 0.0254) : null;
};

for (const d of scan.detail) {
  if (!d.wm) continue;
  const files = unzipSync(readFileSync(d.path));
  const txt = (n) => (files[n] ? strFromU8(files[n]) : '');
  const doc = txt('word/document.xml');
  const rels = txt('word/_rels/document.xml.rels');
  const target = (rid) => new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`).exec(rels)?.[1] ?? new RegExp(`Target="([^"]+)"[^>]*Id="${rid}"`).exec(rels)?.[1];
  const sects = [...doc.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)].map((m) => m[0]);
  const evenOdd = /<w:evenAndOddHeaders\b(?![^>]*w:val="(?:0|false)")/.test(txt('word/settings.xml'));
  const secInfo = sects.map((s) => {
    const refs = [...s.matchAll(/<w:headerReference w:type="(\w+)" r:id="(\w+)"/g)].map((m) => {
      const part = `word/${target(m[2])}`;
      const h = txt(part);
      const wmk = /PowerPlusWaterMarkObject|WordPictureWatermark/.test(h) ? (/<w:docPartGallery w:val="Watermarks"/.test(h) ? 'W+sdt' : 'W') : '-';
      return `${m[1][0]}:${wmk}`;
    });
    const pg = /<w:pgSz w:w="(\d+)" w:h="(\d+)"(?: w:orient="(\w+)")?/.exec(s);
    const mar = /<w:pgMar w:top="(-?\d+)" w:right="(\d+)" w:bottom="(-?\d+)" w:left="(\d+)"/.exec(s);
    const cw = pg && mar ? (+pg[1] - +mar[2] - +mar[4]) / 20 : null;
    const ch = pg && mar ? (+pg[2] - Math.abs(+mar[1]) - Math.abs(+mar[3])) / 20 : null;
    return { refs: refs.join(','), titlePg: /<w:titlePg(?! w:val="(?:0|false)")/.test(s), cw, ch };
  });
  const lines = [];
  for (const w of d.wm) {
    const g = (k) => (new RegExp(`(?:^|;)${k}:([^;]+)`).exec(w.style) ?? [])[1];
    let extra = '';
    if (w.kind === 'pict') {
      const hp = w.part.replace('word/', '');
      const hr = txt(`word/_rels/${hp}.rels`);
      const raw = d.wmRaw[d.wm.indexOf(w)];
      const rid = /r:id="(\w+)"/.exec(raw)?.[1];
      const t = new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`).exec(hr)?.[1];
      const media = t ? files[`word/${t.replace(/^\.\.\//, '').replace(/^media/, 'media')}`] ?? files[`word/${t}`] : undefined;
      const b = media ? Buffer.from(media) : null;
      const sz = b ? pngSize(b) ?? jpgSize(b) : null;
      extra = ` img=${t} px=${sz ? `${sz.w}x${sz.h}` : '?'} dpi=${b ? dpiPng(b) ?? '' : ''} ${w.img.replace(/r:id="…"|o:title="[^"]*"/g, '')}`;
    } else {
      extra = ` ${w.textpath.replace(/font-family:&quot;([^&]*)&quot;/, 'F=$1')} ${w.fill}`;
    }
    lines.push(`   ${w.part} ${w.kind} w=${g('width')} h=${g('height')} rot=${g('rotation') ?? 0} pos=${g('mso-position-horizontal') ?? g('margin-left')}/${g('mso-position-vertical') ?? g('margin-top')} rel=${g('mso-position-horizontal-relative')}${extra}`);
  }
  console.log(`${d.id} evenOdd=${evenOdd} secs=${secInfo.map((s) => `[${s.refs}${s.titlePg ? ' T' : ''} cw=${s.cw} ch=${s.ch}]`).join(' ')}`);
  for (const l of [...new Set(lines)]) console.log(l);
}
